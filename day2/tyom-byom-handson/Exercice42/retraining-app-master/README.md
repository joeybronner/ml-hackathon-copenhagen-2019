# Retraining-app

This is an application to do retraining with the Machine Learning Services. Currently it focuses on image retraining.

## Getting Started

### How to deploy

1. Clone Repository

```
git clone https://github.com/joeybronner/ml-hackathon-copenhagen-2019/day2/tyom-byom-hands-on/Exercice42/retraining-app-master.git
```

2. Adjust the manifest.yml file to your needs
```
- name: <your retraining demo app name>
...
  services:
   - <ml-foundation service instance name>
  env:
   SERVICE_BROKER_NAME: <ml-foundation service instance name>
```

3. Push application to cloud foundry
``` 
cf push
```

## Resources
[request](https://www.npmjs.com/package/request)
[pg-promise](https://www.npmjs.com/package/pg-promise)
[express](https://www.npmjs.com/package/express)
[minio](https://www.npmjs.com/package/minio)

