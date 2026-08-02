---
title: "Building Trust in Data: Productionizing Great Expectations at Scale"
date: "2025-09-20"
canonical: "https://medium.com/@brainbytebyhari/building-trust-in-data-productionizing-great-expectations-at-scale-372120314746"
tags:
  - Data Engineering
excerpt: "How we deployed Great Expectations in production — the challenges, the failures, and what it actually takes to make data validation a first-class citizen in a real pipeline."
---

# Building Trust in Data: Productionizing Great Expectations at Scale

---


In the world of modern data engineering, data quality often takes a backseat — until it breaks something. At our company, we wanted to build trust in our data pipelines, and that led us to Great Expectations. In this post, I’ll walk through how we deployed it in production, the challenges we faced, and what we learned about making data validation a first-class citizen in our workflows.


### Introduction


We all know data quality matters, but it’s easy to take it for granted — until something breaks. Enter Great Expectations — a powerful tool that helped us bring data quality checks right into our everyday workflows and finally **trust** what was coming out of our pipelines.


### About Our Project


We built a secure, scalable data platform using a hybrid stack of open-source tools, AWS, and Snowflake. It supports ingestion from diverse sources — files, RDBMS, NoSQL, Kafka, and APIs — and enables:


- **Data quality checks**
- **Transformation**
- **Data discovery**
- **End-to-end lineage**


A semantic layer makes data accessible to end users, while centralized logging and monitoring ensure platform observability. The entire infrastructure was deployed using Infrastructure as Code (IaC), ensuring consistency and automation, with DevOps fully integrated to speed up development and reduce errors across environments.


### Our Approach to Data Quality: Building a GE Driver for Production Workflows


We implemented data quality checks at the Data Lake layer using Great Expectations (GE), integrating it into our Bronze, Silver, and Gold stages. Each stage had a dedicated property file in the codebase to define the validations, tailored to business rules and expectations.


The jobs ran on Apache Spark via AWS EMR, with data progressing only after passing all quality checks. These were orchestrated using Apache Airflow, and validation results were sent to DataHub to provide visibility into dataset quality across the pipeline.


However, we faced two key challenges:


- **No out-of-the-box support for DataHub integration** with GE’s Spark execution engine — we had to build a custom publishing mechanism.
- The GE Spark tasks were **slow, especially at scale**, due to execution overhead and the lack of optimizations in GE’s Spark integration.


### Solution 1: Custom REST Emitter for DataHub


To tackle the DataHub integration issue, we implemented a custom REST emitter using the Python `acryl-datahub` client library. This emitter leverages DataHub’s REST ingestion API, enabling us to:


- Emit GE validation metadata directly from Spark jobs.
- Programmatically create DataHub assertions from GE expectations.
- Synchronously publish data quality results during pipeline execution.
- Verify connectivity and integration with a test method.


We installed the library using:


Bash

pip install -U acryl-datahub[datahub-rest]
This approach gave us a lightweight, reliable mechanism to surface data quality outcomes in DataHub, enabling dataset-level visibility and governance right from our processing pipelines.


#### Technical Implementation


**Custom Assertion Factories**


Inspired by GE’s internal `DataHubValidationAction`, we built custom assertion factory classes tailored for Spark-based expectations. These classes translate GE validation results into DataHub’s `AssertionInfo` metadata.


Here’s an example for the `expect_column_values_to_not_be_null` expectation:

```python
class ExpectColumnValuesToNotBeNullFactory(AssertionInfoFactory):
    def create_assertion_info(self):
        column_name = self.expectation_config["kwargs"]["column"]
        assertion_urn = (
            f"urn:li:assertion:expect_column_values_to_not_be_null-"
            f"{self.domain_name}-{self.source_name}-{self.dataset_name}-"
            f"{self.job_stage}-{self.environment}-{column_name}"
        )
        assertion_info = AssertionInfo(
            type=AssertionType.DATASET,
            datasetAssertion=DatasetAssertionInfo(
                scope=DatasetAssertionScope.DATASET_COLUMN,
                operator=AssertionStdOperator.NOT_NULL,
                aggregation=AssertionStdAggregation.IDENTITY,
                nativeType="expect_column_values_to_not_be_null",
                fields=[make_schema_field_urn(self.dataset_urn, column_name)],
                dataset=self.dataset_urn,
                parameters=AssertionStdParameters(),
            ),
            customProperties={"suite_name": self.ge_results["meta"]["expectation_suite_name"]},
        )
        return assertion_urn, assertion_info
```
This factory generates a unique assertion URN and metadata that DataHub uses to track this validation.


**Emitting Metadata to DataHub via REST**


We use the `DatahubRestEmitter` class to send metadata change proposals (MCPs) and assertion run events to DataHub.


Here’s a simplified function demonstrating the emission process:

```python
from datahub.emitter.rest_emitter import DatahubRestEmitter
from datahub.metadata.schema_classes import MetadataChangeProposalWrapper

def publish_to_datahub(ge_results, dataset_name, gms_server, token, environment, job_stage, datahub_cert_path, quality_score):
    emitter = DatahubRestEmitter(
        gms_server=gms_server,
        token=token,
        ca_certificate_path=datahub_cert_path
    )
    environment = environment.upper()
    for result in ge_results["results"]:
        expectation_config = result["expectation_config"]
        expectation_type = expectation_config["expectation_type"]
        success = result["success"]
        result_data = result["result"]
        dataset_urn = make_dataset_urn(dataset_name, job_stage, environment)
        dataset_properties = DatasetProperties(name=dataset_name)

        # Emit dataset metadata
        emitter.emit_mcp(MetadataChangeProposalWrapper(entityUrn=dataset_urn, aspect=dataset_properties))

        # Add quality score property
        for patch_mcp in DatasetPatchBuilder(dataset_urn).add_custom_property("Quality Score", f"{round(quality_score)} %").build():
            emitter.emit(patch_mcp)

        # Create and emit assertion metadata
        assertion_urn, assertion_info = create_assertion_info(
            expectation_type, dataset_name, dataset_urn, expectation_config,
            ge_results, job_stage, environment
        )
        emitter.emit_mcp(MetadataChangeProposalWrapper(entityUrn=assertion_urn, aspect=assertion_info))

        # Link assertion to Great Expectations platform
        assertion_platform = DataPlatformInstance(platform=builder.make_data_platform_urn("great-expectations"))
        emitter.emit_mcp(MetadataChangeProposalWrapper(entityUrn=assertion_urn, aspect=assertion_platform))

        # Emit assertion run event
        assertion_run_event = AssertionRunEvent(
            timestampMillis=int(time.time() * 1000),
            assertionUrn=assertion_urn,
            asserteeUrn=dataset_urn,
            runId=str(uuid.uuid4()),
            status=AssertionRunStatus.COMPLETE,
            result=AssertionResult(
                type=AssertionResultType.SUCCESS if success else AssertionResultType.FAILURE,
                rowCount=parse_int_or_default(result_data.get("element_count")),
                missingCount=parse_int_or_default(result_data.get("missing_count")),
                unexpectedCount=parse_int_or_default(result_data.get("unexpected_count")),
                actualAggValue=result_data.get("observed_value") if isinstance(result_data.get("observed_value"), (int, float)) else None,
                nativeResults={
                    k: convert_to_string(v)
                    for k, v in result_data.items()
                    if k in ["observed_value", "details", "unexpected_percent"] and v
                },
            ),
        )
        send_assertion_result_to_datahub(assertion_run_event, emitter)
```
**Verifying the Integration**


We also used the emitter’s `test_connection()` method during development to verify network connectivity and credentials with DataHub’s GMS service:

```python
emitter = DatahubRestEmitter(gms_server, token, ca_certificate_path)
if emitter.test_connection():
    print("DataHub connection successful!")
else:
    print("Failed to connect to DataHub.")
```
By building on top of Great Expectations and extending its native capabilities with a custom DataHub REST emitter and assertion factories, we successfully:


- Bridged the gap between Spark-based data validation and DataHub metadata ingestion.
- Enabled real-time publishing of quality metrics and assertions.
- Empowered teams to build trust through visibility and governance.


### Solution 2: Asynchronous Validation Execution


To reduce the overall runtime and better utilize Spark’s parallelism, we leveraged GE’s `AsyncExecutor`, allowing us to run validation operators concurrently.


This approach helped by:


- **Parallelizing validation execution** across multiple cores.
- **Reducing time** spent waiting for sequential test suite evaluation.
- **Enabling better scalability** with large datasets and expectation suites.


#### How It Works: Async Execution with Great Expectations


We configured the `AsyncExecutor` using GE's concurrency context and the available number of worker nodes (cores). Inside this async block, we submitted the `ValidationOperator` run as a non-blocking task.


**Key Highlights from the Implementation:**


- **BatchRequest:** Dynamically built using a Spark dataframe via `RuntimeBatchRequest`.
- **Expectation Suite:** Optionally modified at runtime based on average record count thresholds.
- **Async Execution:** Wrapped GE’s `ValidationOperator.run()` inside an `AsyncExecutor.submit(...)` block.
- **Result Handling:** Once complete, results were parsed, flattened, and stored for downstream usage (e.g., publishing to DataHub or dashboards).


#### 🔁 Code Snippet (Simplified)

```python
from great_expectations.validation_operators import ActionListValidationOperator
from great_expectations.core.batch import RuntimeBatchRequest
from great_expectations.async_executor import AsyncExecutor

# Construct batch request
batch_request = RuntimeBatchRequest(
    datasource_name="filesystem_datasource",
    data_connector_name="runtime_data_connector",
    data_asset_name="your_dataset_name",
    batch_identifiers={"batch_id": "your_batch_id"},
    runtime_parameters={"batch_data": input_df}
)

# Prepare validator and context
ge_validator = DataValidator(batch_request, secrets_manager)
ge_validator.apply_validations(expectation_config, "your_suite_name")
context = ge_validator.get_or_create_context()

# Define validation actions
action_list = ge_validator.get_action_list()
worker_cores = self.key_value_parser.get_value("worker_node_count")

# Async execution block
with AsyncExecutor(context.concurrency, worker_cores) as async_executor:
    validation_operator = ActionListValidationOperator(
        data_context=context,
        action_list=action_list,
        result_format="SUMMARY",
        name="async-validation-operator"
    )
    async_result = async_executor.submit(
        validation_operator.run,
        assets_to_validate=[ge_validator.validator],
        run_id=datetime.datetime.now().strftime('%Y%m%d'),
        checkpoint_name="async-checkpoint"
    )

    # Wait and fetch results
    validation_results = async_result.result()
```
#### Impact


By integrating `AsyncExecutor`, we saw significant improvements in performance:


- **~30–50% reduction** in end-to-end job time (depending on dataset size and suite complexity).
- Spark jobs were no longer bottlenecked by single-threaded GE execution.
- Made the validation layer more scalable and cloud-friendly, especially when running in multi-core environments