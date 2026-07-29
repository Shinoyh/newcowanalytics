import urllib.request
import json
import urllib.error

url = "https://graph.facebook.com/v20.0/17841440826407138/media?fields=id,timestamp,like_count,comments_count,caption&access_token=EAATW2J46zmABSJYwYibjiubpaLC52ZAKIp8rdv4RMUIPNZAuZAJDZCIIKWg7kghwMAtaNrGqtm1nGGlgyeaL1p95ZCdrFQT2v4yZCMfAzEdo8ENULdQUsoPJYRDmLN1ZCZAUlZApKBcMeDzWlCuCw3xZALfwSo1D2BbDuLrY9Bw1kVnoyEVK9ZABcZB1jdBHFszTzuzN8utpC2jveYjawE2A1R4MZB7KN9YHVwqWuL61fPn5gdZB5iRktspewKWOZCBZATSSwB53LBFk4mD2Mv4d5gZDZD"
try:
    req = urllib.request.Request(url)
    with urllib.request.urlopen(req) as response:
        print(response.read().decode('utf-8'))
except urllib.error.HTTPError as e:
    print(e.read().decode('utf-8'))
