
function getStoredDeviceName()
{
    return new Promise(function(resolve, reject){
        chrome.storage.local.get("deviceName", function(name){
            if(chrome.runtime.lasterror)
            {
                reject(chrome.runtime.lastError);
            }
            else
            {
                if(jQuery.isEmptyObject(name))
                {
                    reject(Error("Name is empty"));
                }
                else
                {
                    resolve(name.deviceName);
                }
            }
        });
    });
}

function setStoredDeviceName(name)
{
    return new Promise(function(resolve, reject){
        chrome.storage.local.set({deviceName: name}, function(){
            if(chrome.runtime.lasterror)
            {
                reject(chrome.runtime.lasterror);
            }
            else
            {
                resolve();
            }
        });
    });
}

function clearStoredDeviceName()
{
    return new Promise(function(resolve, reject){
        chrome.storage.local.remove("deviceName", function(){
            if(chrome.runtime.lasterror)
            {
                reject(chrome.runtime.lasterror);
            }
            else
            {
                resolve();
            }
        });
    });
}

function updateDeviceList()
{
    return GetFileList().then(function(items){
        const dev = new Array();
        items.forEach(function(elem){
            dev.push({name: elem.title, id: elem.id});
        });
        return Promise.resolve(dev);
    }, function(err){
        $('#deviceList').text("<span style='color: red'>Failed to update the device list.</span>");
        return Promise.reject(err);
    });
}

// This assumes that access token is valid.
function CreateFileOnDrive(filename, fileData, mimetype)
{
    let uploadBody = "";
    uploadBody += "--UploadBoundary\n";
    uploadBody += "Content-type: application/json; charset=UTF-8\n\n";
    uploadBody += JSON.stringify({name: filename, parents: ['appDataFolder']});
    uploadBody += "\n--UploadBoundary\n";
    uploadBody += "Content-Type: " + mimetype + "\n\n";
    uploadBody += fileData;
    uploadBody += "\n--UploadBoundary--";

    let status;
    return fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart", {
        method: "POST",
        body: uploadBody,
        headers: {
            "Content-Type": "multipart/related; boundary=UploadBoundary",
            'Authorization': 'Bearer ' + accessToken
        }
    }).then(response => {
        status = response.status;
        return response.json();
    }).then(json => {
        if(status == 200) {
            return Promise.resolve(json);
        } else {
            return Promise.reject({status, response: json});
        }
    });
}

function UpdateFileOnDrive(fileId, data, mimeType)
{
    let status;
    return fetch("https://www.googleapis.com/upload/drive/v2/files/" + fileId + "?uploadType=media", {
        method: "PUT",
        body: data,
        headers: {
            "Content-Type": mimeType,
            'Authorization': 'Bearer ' + accessToken
        }
    }).then(response => {
        status = response.status;
        return response.json();
    }).then(json => {
        if(status == 200) {
            return Promise.resolve(json);
        } else {
            return Promise.reject({status, response: json});
        }
    });
}

function DeleteFileOnDrive(fileId)
{
    let status;
    return fetch("https://www.googleapis.com/drive/v2/files/" + fileId, {
        method: "DELETE",
        headers: {
            'Authorization': 'Bearer ' + accessToken
        }
    }).then(response => {
        status = response.status;
        return response.json();
    }).then(json => {
        if(status == 200) {
            return Promise.resolve(json);
        } else {
            return Promise.reject({status, response: json});
        }
    });
}

// This assumes that access token is valid.
function GetFileList(onsuccess, onerror)
{
    let status;
    return fetch("https://www.googleapis.com/drive/v2/files" + fileId, {
        method: "GET",
        headers: {
            'spaces': 'appDataFolder',
            'Authorization': 'Bearer ' + accessToken
        }
    }).then(response => {
        status = response.status;
        return response.json();
    }).then(json => {
        if(status == 200) {
            return Promise.resolve(json.items);
        } else {
            return Promise.reject({status, response: json});
        }
    });
}

function GetFileData(fileId)
{
    let status;
    return fetch("https://www.googleapis.com/drive/v2/files/" + fileId + "?alt=media", {
        method: "GET",
        headers: {
            'Authorization': 'Bearer ' + accessToken
        }
    }).then(response => {
        status = response.status;
        return response.text();
    }).then(text => {
        if(status == 200) {
            return Promise.resolve(text);
        } else {
            return Promise.reject({status, response: text});
        }
    });
}
