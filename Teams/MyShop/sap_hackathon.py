import json
import re
import os
import time
import requests
from PIL import Image
from io import StringIO
import matplotlib.pyplot as plt

def get_product_class(img, j_obj):
	headers = { "apiKey": yourApiKey,
				'Accept': '*/*'}
	url = "https://sandbox.api.sap.com/ml/prodimgclassifier/inference_sync"
	name_img = j_obj["link"].split("/")[-1]
	files= {'files': (name_img, img) }

	response = requests.post(url=url, files=files, headers=headers)
	json_r = json.loads(response.text)

	max_conf = 0
	m_label = ""
	# Get the prediction with the highest confidence
	for pred in json_r["predictions"][0]["results"]:
		conf = pred["score"]
		if conf > max_conf:
			m_label = pred["label"]
			max_conf = conf

	# looks cleaner to have assignment here
	if len(m_label) > 0:
		j_obj["pname"] = m_label

	return j_obj

def get_text(img, j_obj):
	headers = { "apiKey": yourApiKey,
				'Accept': '*/*'}
	url = "https://sandbox.api.sap.com/mlfs/api/v2/image/ocr"
	name_img = j_obj["link"].split("/")[-1]

	files= {'files': (name_img, img),
			"lang": "en",
			"outputType": "txt",
			"pageSegMode": "6", # important for increase performance
			"modelType": "lstmPrecise" # Takes longer but it is a bit better
			}
	response = requests.post(url=url, files=files, headers=headers)
	json_r = json.loads(response.text)

	# Join the list of words, replace newline with space and spaces with space
	desc_string = " ".join(json_r["predictions"]).strip()
	desc_string = re.sub("\n", " ", desc_string)
	desc_string = re.sub("\s+?", " ", desc_string)

	# set object description to the OCR result
	j_obj["desc"] = desc_string
	return j_obj

def create_langues(j_obj):
	headers = { "apiKey": yourApiKey,
				'Accept': '*/*'}
	url = "https://sandbox.api.sap.com/mlfs/api/v2/text/translation"

	# Remove skey, it's the Unique identifier, if we keep it post will fail
	j_obj.pop("skey")

	# if copy() isnt used they end up as the same objects and thus you have two
	# french entries instead of one french and one german
	fr_json = j_obj.copy()
	de_json = j_obj.copy()

	# Orginally we translated description and name to add name back in simply
	# change ["desc"] => ["desc", "pname"]
	for key in ["desc"]:
		message = {
			"sourceLanguage": "en",
			"targetLanguages": ["de",
								"fr"],
			"units": [{ "value": j_obj[key],
						"key": "CART_CONTENTS"}]
		}
		response = requests.post(url=url, json=message, headers=headers)
		json_r = json.loads(response.text)

		# Replace descriptions with the translation hardcoded langs #NoShame
		for trans in json_r["units"][0]["translations"]:
			if trans["language"] == "de":
				de_json["lng"] = trans["language"]
				de_json[key] = trans["value"]
			if trans["language"] == "fr":
				fr_json["lng"] = trans["language"]
				fr_json[key] = trans["value"]

	post_to_database(fr_json)
	post_to_database(de_json)

def update_database(debug=False):
	"""
	Main Function to update the database.
	Database is a simple json database with the following fields:
	{
		'modifiedAt': '2019-09-27T11:13:46Z',
		'createdAt': '2019-09-27T11:13:02Z',
		'createdBy': 'anonymous',
		'modifiedBy': 'anonymous',
		'skey': 'da440b4a-b7f6-4a71-8e96-c2df27e86abc',
		'lng': 'en',
		'pid': '259477',
		'pname': 'notebooks & accessories',
		'link': 'https://i.imgur.com/xUw59m2.jpg',
		'desc': 'Notebook Ipad',
		'valid': True
	}
	"""

	data = get_to_database()

	# Important to first go through all the product images since the text
	# image is dependent on the pid of the product image
	for file in data["value"]:
		if file["pname"] == None or "unmodified_product" == file["pname"]:
			raw_img = requests.get(file["link"], stream = True).raw
			file = get_product_class(raw_img, file)

			# Update the product with product name from the API
			put_to_database(file)

			if debug:
				# we dont care about calling it again
				img = Image.open(requests.get(file["link"], stream = True).raw)
				plt.imshow(img)
				plt.show()


	for file in data["value"]:
		# pname should never be None but we check anyway, check for text-images
		if file["pname"] != None and "unmodified_text" == file["pname"]:
			# If there is a text image, go through all the images looking for
			# its twin product image. Each text and produt image pair share a
			# pid in the database
			for f_file in data["value"]:
				if file["pid"] == f_file["pid"] and f_file["pname"] != "unmodified_text":
					raw_img = requests.get(file["link"], stream=True).raw

					# Send image to SAP API and populate description
					f_file = get_text(raw_img, f_file)

					# Update the product with the description in the database
					put_to_database(f_file.copy())


					# Translate the description to French and German and post
					# them to the database
					create_langues(f_file.copy())

					# Delete the text-image from the database since we do not
					# need it anymore
					delete_to_database(file.copy())

					if debug:
						# we dont care about calling it again
						img = Image.open(requests.get(file["link"], stream = True).raw)
						plt.imshow(img)
						plt.show()


	print("Updated Database")

def get_to_database():
	headers = {	'Content-Type': 'application/json'	}
	url = "https://uft4ofhbc79qgwz5-my-shop-srv.cfapps.eu10.hana.ondemand.com/catalog/Items"
	response = requests.get(url=url, headers=headers)
	data = json.loads(response.text)
	return data

def post_to_database(input):
	url = "https://uft4ofhbc79qgwz5-my-shop-srv.cfapps.eu10.hana.ondemand.com/catalog/Items"
	headers = {	'Content-Type': 'application/json'	}
	response = requests.post(url=url, json=input, headers=headers)
	print(response.text)

def put_to_database(input):
	url = "https://uft4ofhbc79qgwz5-my-shop-srv.cfapps.eu10.hana.ondemand.com/catalog/Items({0})".format(input["skey"])
	headers = {	'Content-Type': 'application/json'	}
	response = requests.put(url=url, json=input, headers=headers)
	print(response.text)

def delete_to_database(input):
	url = "https://uft4ofhbc79qgwz5-my-shop-srv.cfapps.eu10.hana.ondemand.com/catalog/Items({0})".format(input["skey"])
	headers = {	'Content-Type': 'application/json'	}
	response = requests.delete(url=url, headers=headers)
	print(response.text)

while True:
	update_database()
	time.sleep(20)
