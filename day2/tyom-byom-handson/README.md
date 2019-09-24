<p align="center">
  <a href="https://coil.sap.com">
    <img src="http://blogs.saphana.com/wp-content/uploads/2017/09/Picture1-1.png" alt="SAP Machine Learning" width=356 height=256>

  </a>
  <h1 align="center">SAP Machine Learning</h1>
  <h2 align="center">Hands-On</h2>
</p>

<br />

## Table of Contents

### Steps
- [Prerequisites](#Prerequesites)

#### Model Retrain

- [Step 1 - SAP Cloud Cockpit](#step-1---SAP_Cloud_Cockpit)
- [Step 2 - Re-train Image Classification with sapml](#step-2---Re-train-Image-Classification-with-sapml)
- [Step 3 - SAPML CF plugin](#step-3---SAPML-CF-plugin)
- [Step 4 (Optional) Uploading images before retraining 1](#step-5---Uploading-images-before-retraining-1)
- [Step 5 Install Minio](#step-5---Install-Minio)
- [Step 6 Submit a retraining job](#step-6---Submit-a-Retraining-job)
- [Step 7 Deploying the model](#step-7---Deploying-the-model)

#### Bring Your Own Model
- [Step 1 Bring Your Own Model Minst](#step-1---BYOM-Minst)
- [Step 2 BYOM get the Sample](#step-2---BYOM-get-the-Sample)
- [Step 3 Serving the model](#step-3---Serving-the-model)
- [Step 4 Serving the model](#step-4---Building-an-Inference-application)


<a name="Prerequesites"></a>
# Prerequesites

## Install Cloud Foundry (CLI)
Go to Cloud Foundry CLI download:
https://github.com/cloudfoundry/cli#downloads

## Download and run the installer specific for your platform.
Online Help :
https://developers.sap.com/tutorials/cp-cf-download-cli.html

## Install Chrome Postman application
https://chrome.google.com/webstore/detail/postman/fhbjgbiflinjbdggehcddcbncdddomop

## Install Chrome Postman Interceptor application
1.	Navigate to https://chrome.google.com/webstore/search/postman%20interceptor and select the Postman Interceptor tool
2. Click Add to Chrome


<a name="step-1---SAP_Cloud_Cockpit"></a>

# Step 1 - SAP Cloud Cockpit
## Login to CF CL

cf login -a api.cf.us10.hana.ondemand.com -u ml-train+us-112@sap.com

## Listing all Services 
Cf services

<a name="#step-2---Re-train-Image-Classification-with-sapml"></a>

# Step 2  Re-train Image Classification with sapml

cf login -a api.cf.us10.hana.ondemand.com -u ml-train+us-112@sap.com

cf service-key ml_instance_2806 ml_instance_2806_key

<a name="step-3---SAPML-CF-plugin"></a>

# Step 3 SAPML CF plugin

## Download the SAPML CF plugin 
https://tools.hana.ondemand.com/#mlfoundation 
cf install-plugin -f your Folder\sapmlcli 

## Setting/Getting sapml config

cf sapml config get

cf sapml config set auth_server https://ml-train-us-112.authentication.us10.hana.ondemand.com

cf sapml config set job_api https://training.prod.us-east-1.aws.ml.hana.ondemand.com

cf sapml config set retraining_image_api https://mlfproduction-retrain-image-api.cfapps.us10.hana.ondemand.com/api/v2/image/retraining

## Init and list sapml fs (file system)
cf sapml fs init

cf sapml fs list Brands/training/ 

<a name="step-4---Uploading-images-before-retraining-1"></a>
# Step 4 (Optional) Uploading images before retraining 1
 https://help.sap.com/viewer/a86b12f81f424c45a0e7c83c1d5025c4/1904B/en-US/65df4d78cb6b485aab2c9fb11ae89ac1.html


<a name="step-5---Install-Minio"></a>
# Step 5 Install Minio

brew install minio/stable/minio

## Install minio/mc
brew install minio/stable/mc

Cf sapml fs config  // to retrieve credentials and end point

## Recursively upload the local directory jewelry_local to remote directory “jewelry” add your credentials once: 
./mc config host add saps3 https://[endpoint] [access_key] [secret_key]. 

You can then upload the file: 
./mc cp ~/.../jewelry_local  saps3/data/jewelry -- recursive

## Lancer Minio Webserver
	https://[endpoint]


<a name="step-6---Submit-a-Retraining-job"></a>
# Step 6 Submit a retraining job

### Edit : retrain.json
Launching the retraining
cf sapml retraining job_submit retrain.json –m image

### Checking the status : 
cf sapml retraining jobs –m image

### Check Job status with Swagger UI from Retraining URL
Retrieving the logs
List all the jobs :
cf sapml fs list jobs/

### Get a log file

cf sapml fs get <job_name>/retraining.log  <local_name.log>

<a name="step-7---Deploying-the-model"></a>
# Step 7 Deploying the model

Model is stored in a repository and needs to be deployed 
### Listing all the models that can be deployed:
cf sapml retraining models –m image
### Deploy the model 
cf sapml retraining model_deploy [model_name] [version] -m model
cf sapml retraining model_deploy Brands1 1 –m image

### List of models to deploy
To get the list of all the models currently deployed 
cf sapml retraining model_deployments –m image

### Listing all deployed models
cf sapml modelserver list

### Getting info on a deployed model
cf sapml modelserver get <model_id>

### Undeploying a model 
cf sapml modelserver delete <model_id>

# Bring Your Own Model

<a name="step-1---BYOM-Minst"></a>
# Step1 Bring Your Own Model Minst

Only TensorFlow is supported 1.3, 1.7, 1.8

### config
Edit file ~.mc/config.json to add previously retrieved 
•	secretkey 
•	accessKey

### Launch Minio Webserver
https://play.min.io:9000/minio/login
Re-train Image Classification with sapml

### Display Service
Enter the command: 
cf service-key [instance name] [service key] 
to display your service key and make sure that everything is available. 
cf sapml modelserver delete [model_id]

<a name="step-2---BYOM-get-the-Sample"></a>
# Step 2 BYOM get the Sample
To access the model sample
https://github.com/saphanaacademy/MLF        File: mnist.zip

### list the models
To list the models in the repo:
cf sapml model list

### Create a model
cf sapml model create minst -f minst.zip

This will upload the model and create it on the server

<a name="step-3---Serving-the-model"></a>
# Step 3 Serving the model

We need to serve it (i.e. deploy it)
cf sapml modelserver 

### Resource plan
Pay attention to the fact that to deploy a new model you need to associate to a resource plan

List all the resource plans :
cf sapml modelserver resourceplans

### Model deploy
Deploy a model in the resource plan cpu-small
cf sapml modelserver create mnist -r cpu-small -u [version]

Getting info on the deployed model 
	cf sapml modelserver get [modelserverid]


<a name="step-4---Building-an-Inference-application"></a>
# Step 4 Building an Inference Application    


    
### Application BYOM App.py

Edit the manifest.yml

---
applications:
- name: byom
  host: ml-train-us112-byom
  memory: 256M
  disk_quota: 1028M
  timeout: 60
  buildpack: python_buildpack
services:
- ml_instance_2806
env:
  MLF_SERVICE: ml-foundation-trial-beta

### Deplying the inference Application
Application BYOM:
Create unique name for application : 
host : [subaccount-name]-byom
Services :  // can be find with: cf s
Env: MLF_SERVICE: // can be find with command: cf sapml config get 

After editing the manifest.yml type cf push

This will deploy the application in the cloud.

To check details about the application being deployed:
Cf app byom

Launch postman and do a POST with:
https://ml-train-us112-byom.cfapps.us10.hana.ondemand.com/mnist



