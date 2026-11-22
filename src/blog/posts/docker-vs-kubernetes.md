---
title: "Docker vs Kubernetes: Not Rivals, Two Layers of the Same Stack"
subtitle: "Docker packages and runs a container on one machine. Kubernetes keeps thousands of them alive across many."
date: 2026-10-15
tags:
  - Architecture
  - DevOps
  - Containers
  - Explainer
excerpt: "Docker and Kubernetes are not competing alternatives. One builds and runs containers on a single host; the other orchestrates them across a cluster. Here's how each works under the hood, and where one hands off to the other."
---

# Docker vs Kubernetes: Not Rivals, Two Layers of the Same Stack

### Docker packages and runs a container on one machine. Kubernetes keeps thousands of them alive across many.

"Should we use Docker or Kubernetes?" is one of the most common questions I hear, and it's the wrong question. They solve different problems at different layers. Docker is how you **build and run** a container. Kubernetes is how you **operate** many containers across many machines, reliably, without a human watching them.

{% figure "docker-vs-kubernetes.webp", "Side-by-side diagram: on the left, the Docker CLI talks to dockerd, which hands off to containerd, then runc, which starts a container on the Linux kernel of a single host. On the right, kubectl apply sends a Deployment YAML to the Kubernetes API server; the control plane (etcd, controller manager, scheduler) places pods on two worker nodes, each running a kubelet and a CRI runtime; client traffic flows through an Ingress to a Service and on to the pods.", "Docker runs containers on one host. Kubernetes turns a cluster of hosts into one pool and continuously reconciles it to the state you declared." %}

## Docker: one host, one command

Follow the left side of the diagram. When you type `docker run checkout:v2`:

1. The **Docker CLI** sends the request to **dockerd**, the Docker daemon.
2. dockerd hands the work to **containerd**, which pulls the image and manages the container's lifecycle.
3. containerd calls an **OCI runtime**, usually **runc**, which asks the **Linux kernel** for namespaces and cgroups. That isolated process is your **container**.

The pieces you touch day to day:

- **Dockerfile** — a text recipe for building an image.
- **Registries (Docker Hub, ECR, GCR, Artifact Registry)** — where images are stored and shared. Think of it as a package manager for whole runtime environments.
- **Docker Engine** — the daemon plus the CLI that actually builds and runs containers.

**Where Docker shines:** local development, killing "works on my machine", fast prototyping, and CI/CD pipelines that build and test images.

**Where it stops:** everything in that picture lives on **one host**. If that machine dies, its containers die with it. Docker Compose helps you describe multi-container apps, but it's still single-host. Docker Swarm exists for clustering, but in practice the industry has standardised on Kubernetes for multi-node orchestration.

## Kubernetes: you declare, the cluster reconciles

Kubernetes picks up where the single host ends. It makes a fleet of machines behave like one pool of compute.

The key mental shift: with Docker you give **commands** ("run this"). With Kubernetes you give a **desired state** ("I want 3 replicas of `checkout:v2`") and the cluster works continuously to make reality match it.

Follow the right side of the diagram:

1. `kubectl apply` sends your **Deployment YAML** to the **API server**, the only component everything else talks to.
2. The desired state is stored in **etcd**, the cluster's key-value database.
3. The **controller manager** notices "3 wanted, 0 running" and creates pods to close the gap.
4. The **scheduler** decides which **node** each pod should land on, based on available CPU, memory and constraints.
5. On each node, the **kubelet** sees pods assigned to it and tells the **CRI-compatible runtime** (containerd or CRI-O) to start their containers.
6. Client traffic enters through an **Ingress / Gateway**, which routes to a **Service**, which load-balances across the matching pods, wherever they happen to run.

If Node 2 dies, Pod C disappears, the controller sees "2 running, 3 wanted", and the scheduler places a replacement on a healthy node. Nobody gets paged for that.

### Core concepts

- **Pods** — Kubernetes never manages a bare container. The smallest unit is a pod: one or more tightly coupled containers sharing a network namespace (same IP) and optionally storage volumes.
- **Control plane vs worker nodes** — the control plane (API server, etcd, scheduler, controllers) decides; the worker nodes (kubelet, runtime, kube-proxy) execute and report back.

### What you get on top

- **Service discovery and load balancing** — each pod gets its own IP, and a Service gives a stable DNS name and virtual IP in front of a changing set of pods.
- **Self-healing** — failed containers restart; pods on a dead node get rescheduled; pods failing their readiness probe stop receiving traffic.
- **Rolling updates and rollbacks** — change the image tag and pods are replaced gradually. If the new pods never become ready, the rollout stalls instead of taking everything down, and `kubectl rollout undo` takes you back. (Kubernetes does not roll back automatically on its own; tools like Argo Rollouts or Flagger add that.)
- **Horizontal scaling** — scale by hand or let the Horizontal Pod Autoscaler react to CPU, memory or custom metrics.
- **Storage orchestration** — PersistentVolumeClaims mount local disks, cloud volumes (AWS EBS, GCP Persistent Disk) or network storage without the pod knowing which.
- **Config and Secrets** — inject configuration and credentials at runtime instead of baking them into images. Note that Secrets are only base64-encoded by default; turn on encryption at rest or use an external secrets manager for anything sensitive.

## Side by side

| | Docker | Kubernetes |
|---|---|---|
| **Scope** | A single host | A cluster of many hosts |
| **Model** | Imperative: run this container | Declarative: keep this state true |
| **Unit** | Container | Pod (one or more containers) |
| **Failure handling** | Restart policy on the same host | Reschedule onto healthy nodes |
| **Networking** | Bridge networks, port mapping | Pod IPs, Services, Ingress / Gateway |
| **Scaling** | Manual | Manual or autoscaled |
| **Best for** | Building images, local dev, CI | Running production workloads at scale |

## How they fit together

The usual flow in a modern team:

1. A developer writes a **Dockerfile** and builds an image locally.
2. CI builds the same image, runs tests, and pushes it to a **registry**.
3. A Deployment manifest (often managed by Helm or a GitOps tool such as Argo CD) points **Kubernetes** at the new tag.
4. Kubernetes rolls it out across the cluster and keeps it healthy.

Docker is the **build** tool. Kubernetes is the **operations** platform.

## "Kubernetes dropped Docker" — what that actually means

In 2022 (Kubernetes 1.24) the `dockershim` adapter was removed, so Kubernetes no longer talks to the Docker Engine. It talks directly to a lightweight runtime through the **Container Runtime Interface (CRI)**: usually **containerd** (originally spun out of Docker, and visible in the left side of the diagram) or **CRI-O**.

This changed nothing for your images. Images built with Docker follow the **Open Container Initiative (OCI)** standard, so any CRI runtime runs them exactly as before. Kubernetes didn't drop Docker images; it just stopped needing the Docker daemon in the middle.

## How I use them

I use Docker and Kubernetes every day, across all of my projects. Docker is where every service starts: it's how I package code so it runs the same on my laptop, in CI, and in production. Kubernetes is what I rely on for scaling: when load goes up, I add replicas or let the autoscaler do it, and the cluster spreads them across nodes without me touching a server.

The split in this post is exactly how it works day to day. Docker answers "does this run?", and Kubernetes answers "will it keep running, at whatever scale we need?"

## When do you actually need Kubernetes?

Not always. Kubernetes brings real operational weight. A rough rule:

- **One or two services, one server, low traffic** — Docker plus Compose, or a managed container service (Cloud Run, AWS App Runner, Azure Container Apps), is usually enough.
- **Many services, high availability, autoscaling, several teams sharing infrastructure** — that's where Kubernetes earns its complexity. Use a managed offering (EKS, GKE, AKS) rather than running the control plane yourself.

Start with Docker. Reach for Kubernetes when the problems it solves are problems you actually have.
