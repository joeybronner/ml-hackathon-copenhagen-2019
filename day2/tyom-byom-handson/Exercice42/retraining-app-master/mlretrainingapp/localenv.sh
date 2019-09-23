#!/bin/bash
export USE_UAA_AND_PG=false
export SERVICE_BROKER_NAME=ml-foundation-std
export VCAP_SERVICES='
{
  "ml-foundation-mlfintegration": [
    {
      "name": "ml-foundation-std",
      "instance_name": "ml-foundation-std",
      "binding_name": null,
      "credentials": {
        "clientid": "sb-f6e19998-f1c8-439f-803c-3389f55e30da!b1370|foundation-std-mlfintegration!b1370",
        "appname": "f6e19998-f1c8-439f-803c-3389f55e30da!b1370|foundation-std-mlfintegration!b1370",
        "identityzone": "mlfintegration",
        "identityzoneid": "d9608852-3c17-45fa-b576-f7c1d8bf52de",
        "clientsecret": "9iYcI4UkPU6/Mkycsw0HdarSIY4=",
        "serviceurls": {
          "IMAGE_CLASSIFIER_URL": "https://mlfintegration-image-classifier.cfapps.sap.hana.ondemand.com/api/v2/image/classification",
          "IMAGE_RETRAIN_API_URL": "https://mlfintegration-retrain-image-api.cfapps.sap.hana.ondemand.com/api/v2/image/retraining"
        },
        "url": "https://mlfintegration.authentication.sap.hana.ondemand.com"
      },
      "syslog_drain_url": null,
      "volume_mounts": [],
      "label": "ml-foundation-mlfintegration",
      "provider": null,
      "plan": "standard",
      "tags": [
        "ml-foundation-mlfintegration services"
      ]
    }
  ]
}'

