# importing the requests library
# see https://2.python-requests.org//en/latest/user/quickstart/#more-complicated-post-requests 
import requests 
import sys

if len(sys.argv) < 2:
	print("please pass in your apikey")
	exit();
  
# defining the api-endpoint  
API_ENDPOINT = "https://sandbox.api.sap.com/ml/api/v2alpha1/text/lang-detect/"
  
# your API key here 
APIKey = sys.argv[1];
  
# data to be sent to api 
data = '{"message": "this is a string"}'

headers = {'APIKey': APIKey, "Content-Type" : "application/json"}

# sending post request and saving response as response object 
r = requests.post(url = API_ENDPOINT, data = data, headers=headers) 
  
# extracting response text  
response = r.text 
print("The response is:%s"%response) 
