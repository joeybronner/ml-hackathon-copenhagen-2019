import json
import requests
import os
from flask import Flask, request, render_template, send_from_directory
from flask_socketio import SocketIO
from base64 import b64encode

app = Flask(__name__)
app.config['SECRET_KEY'] = '!dpx7^w&@_iw1pq%b@)n&^qhy6i&wyg_gu0w@o&4y(ow2@%4f*'
socketio = SocketIO(app)

service = (json.loads(os.getenv('VCAP_SERVICES', '')))['ml-foundation'][0]

MODEL_NAME = str(os.getenv('MODEL_NAME', ''))
client_id = str(service['credentials']['clientid'])
client_secret = str(service['credentials']['clientsecret'])
authentication_url = str(service['credentials']['url']) + "/oauth/token"


def get_access_token():
    querystring = {"grant_type": "client_credentials"}
    auth = b64encode(b"" + client_id + ":" + client_secret).decode("ascii")
    headers = {
        'Cache-Control': "no-cache",
        'Authorization': "Basic %s" % auth
    }
    response = requests.request("GET", authentication_url, headers=headers, params=querystring)
    return 'Bearer ' + json.loads(response.text)['access_token']


@app.route('/do_inference', methods=['POST'])
def main():
    access_token = get_access_token()

    deployment_url = str(service['credentials']['serviceurls']['TEXT_LINEAR_RETRAIN_API_URL']) + "/deployments"
    text_classifier_url = str(service['credentials']['serviceurls']['TEXT_CLASSIFIER_URL'])
    headers = {
        'Authorization': get_access_token(),
        'Cache-Control': "no-cache"
    }
    response = requests.request("GET", deployment_url, headers=headers)
    model_info = json.loads(response.text)
    latest_version = [0, 0]
    for index, model in enumerate(model_info["deployments"]):
        if int(model["modelVersion"]) > latest_version[0] and model["modelName"] == MODEL_NAME:
            latest_version = [int(model["modelVersion"]), index]
    parameters = json.loads(request.data)
    url = text_classifier_url + "/models/" + \
          MODEL_NAME + "/versions/" + str(latest_version[0])
    payload = {
        'texts': parameters['text']
    }
    headers = {
        'Authorization': access_token,
        'Cache-Control': "no-cache",
    }
    response = requests.request("POST", url, data=payload, headers=headers)
    response = response.json()
    print("URL: {}".format(url))
    print("Response: {}".format(response))
    return(json.dumps({
        response['predictions'][0]['results'][0]['label']: response['predictions'][0]['results'][0]['score'],
        response['predictions'][0]['results'][1]['label']: response['predictions'][0]['results'][1]['score']
    }))


@app.route('/', methods=["GET"])
def serve_index():
    return render_template('index.html')


@app.route('/<path:path>')
def static_proxy(path):
    if ".js" in path or "i18n" in path or "favicon" in path or ".json" in path or ".css" in path:
        return send_from_directory('templates', path)
    else:
        return render_template(path)


port = os.getenv('PORT', 5000)
if __name__ == '__main__':
    app.debug = not os.getenv('PORT')
    socketio.run(app, host='0.0.0.0', port=int(port))
