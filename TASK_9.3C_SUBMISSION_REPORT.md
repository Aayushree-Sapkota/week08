# SIT722 – Software Deployment and Operation
## Task 9.3C: Continuous Deployment using GitHub Actions
**Student Name:** Aayushree Sapkota  
**Student ID:** s225598173  

---

## 1. Overview & Objective

The objective of this task is to extend the Continuous Delivery pipeline explored in Task 8.1P into a fully automated **Continuous Deployment (CD)** pipeline using GitHub Actions, Azure Container Registry (ACR), and Azure Kubernetes Service (AKS).

In Task 8.1P (Continuous Delivery), software artifacts were automatically built, tested, and deployed to a staging environment. However, promotion to production remained a **manual gatekeeper step** requiring manual invocation of `04-deploy-production.yml` with the tested Git commit SHA. 

In this task (Continuous Deployment), the manual gatekeeper is eliminated. Production deployment is fully automated so that once changes pass automated staging tests, the exact same tested container images are automatically promoted to the production environment on AKS without human intervention.

---

## 2. Pipeline Architecture & Code Changes

### 2.1 Continuous Delivery vs. Continuous Deployment Workflow

The following diagram illustrates the automated multi-stage promotion pipeline:

```text
[Developer / PR Merge to main]
            │
            ▼
[01 - CI: Backend Tests & Docker Build/Push to ACR]
            │ (on success)
            ▼
[02 - Deploy to Staging: Deploy manifests & update container images]
            │ (on success)
            ▼
[03 - Test Staging: Automated smoke tests against Staging Frontend IP]
            │ (on success - AUTOMATIC TRIGGER)
            ▼
[04 - Deploy to Production: Auto-promote tested image to Production]
```

---

### 2.2 Workflow Modifications

#### A. Automating Production Deployment (`.github/workflows/04-deploy-production.yml`)

In Task 8.1P, the production deployment workflow was manually triggered via `workflow_dispatch` and required manual input of the commit SHA. In Task 9.3C, the workflow was modified to:
1. Listen for the `workflow_run` event indicating completion of `"03 - Test Staging"` on the `main` branch.
2. Evaluate that the staging tests completed successfully (`github.event.workflow_run.conclusion == 'success'`).
3. Automatically capture the tested commit SHA from `github.event.workflow_run.head_sha`.
4. Check out the tested commit and update the Kubernetes production deployments with this exact image tag.

**Code Comparison:**

```yaml
# Before (Task 8.1P - Continuous Delivery - Manual Trigger):
name: 04 - Deploy to Production

on:
  workflow_dispatch:
    inputs:
      image_tag:
        description: "Tested image SHA to deploy"
        required: true
        type: string

# After (Task 9.3C - Continuous Deployment - Automated Promotion):
name: 04 - Deploy to Production

on:
  workflow_run:
    workflows:
      - "03 - Test Staging"
    types:
      - completed
    branches:
      - main

  workflow_dispatch:
    inputs:
      image_tag:
        description: "Tested image SHA to deploy"
        required: false
        type: string

jobs:
  deploy-production:
    name: Deploy to Production
    runs-on: ubuntu-latest

    if: >
      ${{ github.event_name == 'workflow_dispatch' || github.event.workflow_run.conclusion == 'success' }}

    environment:
      name: production

    env:
      IMAGE_TAG: ${{ inputs.image_tag || github.event.workflow_run.head_sha || github.sha }}

    steps:
      - name: Checkout tested commit
        uses: actions/checkout@v4
        with:
          ref: ${{ env.IMAGE_TAG }}
...
```

---

#### B. Enabling Pull Request Validation in CI (`.github/workflows/01-ci.yml`)

The CI workflow was enhanced with a `pull_request` trigger for the `main` branch. This ensures that any incoming pull requests are automatically validated against backend unit tests before merging.

```yaml
on:
  push:
    branches:
      - main
  pull_request:
    branches:
      - main
  workflow_dispatch:
```


---

### 2.3 Configuration Requirements

The following repository variables and secrets were configured in GitHub to enable automated communication between GitHub Actions, ACR, and AKS:

| Category | Name | Description |
| :--- | :--- | :--- |
| **Repository Secret** | `AZURE_CREDENTIALS` | Azure Service Principal authentication credentials (JSON). |
| **Repository Variable** | `ACR_NAME` | Name of the Azure Container Registry (`s225598173Week08Acr`). |
| **Repository Variable** | `ACR_LOGIN_SERVER` | ACR login server URL (`s225598173week08acr.azurecr.io`). |
| **Repository Variable** | `AKS_RESOURCE_GROUP` | Resource group hosting the cluster (`koalatech-week08-rg`). |
| **Repository Variable** | `AKS_CLUSTER_NAME` | AKS cluster name (`s225598173Week08Aks`). |
| **Environment Secrets** | Staging & Production | `POSTGRES_USER`, `POSTGRES_PASSWORD`, `JWT_SECRET_KEY`, `DEFAULT_ADMIN_*`, `AZURE_STORAGE_CONNECTION_STRING`. |


---

## 3. Demonstration of Automated Continuous Deployment

### 3.1 Frontend Modification

To provide verifiable visual evidence of automated deployment:
1. Updated `frontend/src/components/Header.jsx` to change the application title to `KoalaTech University - CD Pipeline (Task 9.3C)` and added a `Continuous Deployment v2.0` badge.
2. Updated `frontend/src/theme.js` to change the primary brand color from default blue (`#1565C0`) to Vibrant Teal (`#00796B`) and secondary to Deep Orange (`#E65100`).



---

### 3.2 Pull Request Submission and Merge

A feature branch `feature/frontend-cd-update` was created and pushed to GitHub. A Pull Request was opened to merge the changes into `main`.

---

### 3.3 Automated Pipeline Execution

Upon merging the Pull Request, the entire Continuous Deployment pipeline triggered and completed automatically without any manual intervention:

1. **`01 - CI`**: Executed backend unit tests for 5 microservices, built 6 Docker images, and pushed them to ACR tagged with the merge commit SHA.
2. **`02 - Deploy to Staging`**: Automatically triggered by `workflow_run`, configured the `staging` namespace, applied manifests, and rolled out the new images.
3. **`03 - Test Staging`**: Automatically triggered by `workflow_run`, resolved the staging frontend external IP, and executed HTTP smoke tests.
4. **`04 - Deploy to Production`**: Automatically triggered upon success of `03 - Test Staging`, configured the `production` namespace, and deployed the exact same tested container images without rebuild.


---

### 3.4 Verification in Production System

The production system was accessed via the frontend LoadBalancer external IP.

The live application reflected:
- The updated heading: `KoalaTech University - CD Pipeline (Task 9.3C)`
- The new `Continuous Deployment v2.0` badge
- The new Vibrant Teal navigation bar theme

---

## 4. Teardown & Resource Cleanup

Upon completion and verification of the Continuous Deployment demonstration, all Azure resources were destroyed to avoid unnecessary cloud consumption:

```bash
az group delete --name koalatech-week08-rg --yes --no-wait
```
or
```bash
terraform destroy -auto-approve
```


---

## 5. Conclusion

Task 9.3C successfully demonstrated the transition from Continuous Delivery to Continuous Deployment. By automating the production deployment stage via GitHub Actions `workflow_run` chained after staging verification, code updates merged via a pull request flowed directly and reliably into production with zero manual promotion steps.
