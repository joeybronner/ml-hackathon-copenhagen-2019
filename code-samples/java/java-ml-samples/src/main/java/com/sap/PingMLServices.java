package com.sap;

import org.apache.http.HttpEntity;
import org.apache.http.client.methods.CloseableHttpResponse;
import org.apache.http.client.methods.HttpPost;
import org.apache.http.entity.ContentType;
import org.apache.http.entity.StringEntity;
import org.apache.http.impl.client.CloseableHttpClient;
import org.apache.http.impl.client.HttpClients;
import org.json.JSONArray;
import org.json.JSONObject;
import org.json.JSONTokener;

public class PingMLServices {

	public static void main(String[] args) throws Exception {
		if(args.length < 0) {
			System.out.println("you should enter an APIKey: java PingMLServices myapikey");
			System.exit(0);
		}
		
		String apiKey = args[0];
		String url = "https://sandbox.api.sap.com/mlfs/api/v2/text/translation";
		
		CloseableHttpClient httpClient = HttpClients.createDefault();
		HttpPost uploadFile = new HttpPost(url);
		uploadFile.addHeader("Accept", "application/json");
		uploadFile.addHeader("APIKey", apiKey);

		String data = createTranslationJSON("Can you translate this please?").toString();
				
		StringEntity requestEntity = new StringEntity(data, ContentType.APPLICATION_JSON);
		uploadFile.setEntity(requestEntity);
		
		
		CloseableHttpResponse response = httpClient.execute(uploadFile);
		HttpEntity responseEntity = response.getEntity();

		JSONTokener tokener = new JSONTokener(responseEntity.getContent());
		JSONObject results = new JSONObject(tokener);

		System.out.println(results.toString());	
	}	
	
	public static JSONObject createTranslationJSON(String text){
		JSONObject inob = new JSONObject();
		inob.put("sourceLanguage", "en").put("targetLanguages", new JSONArray().put("fr").put("de"));
		inob.put("units", new JSONArray().put(new JSONObject().put("value", text)));
		return inob;
	}

}
