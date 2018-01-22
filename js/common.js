
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
    return new Promise(function(resolve, reject){
        GetFileList().then(function(items){
            var devices = new Array();
            items.forEach(function(elem){
                devices.push({name: elem.title, id: elem.id});
            });
            resolve(devices);
        }, function(err){
            $('#deviceList').append("<span style='color: red'>Failed to update the device list.</span>");
            reject(err);
        });
    });
}

// This assumes that access token is valid.
function CreateFileOnDrive(filename, fileData, mimetype)
{
    return new Promise(function(resolve, reject){
        var ajax = new XMLHttpRequest();
        ajax.onreadystatechange = function() {
            if(this.readyState == 4){
                if(this.status == 200)
                {
                    resolve(JSON.parse(this.responseText));
                }
                else
                {
                    reject(Error(JSON.stringify({status: this.status, response: this.responseText})));
                }
            }
        };

        var uploadBody = "";
        uploadBody += "--UploadBoundary\n";
        uploadBody += "Content-type: application/json; charset=UTF-8\n\n";
        uploadBody += JSON.stringify({name: filename, parents: ['appDataFolder']});
        uploadBody += "\n--UploadBoundary\n";
        uploadBody += "Content-Type: " + mimetype + "\n\n";
        uploadBody += fileData;
        uploadBody += "\n--UploadBoundary--";

        ajax.open("POST",
            "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart", true);
        ajax.setRequestHeader('Content-Type', 'multipart/related; boundary=UploadBoundary');
        ajax.setRequestHeader('Authorization', 'Bearer ' + accessToken);
        ajax.send(uploadBody);
    });
}

function UpdateFileOnDrive(fileId, data, mimeType)
{
    return new Promise(function(resolve, reject){
        var ajax = new XMLHttpRequest();
        ajax.onreadystatechange = function() {
            if(this.readyState == 4){
                if(this.status == 200)
                {
                    resolve(JSON.parse(this.responseText));
                }
                else
                {
                    reject(Error(JSON.stringify({status: this.status, response: this.responseText})));
                }
            }
        };

        ajax.open("PUT",
            "https://www.googleapis.com/upload/drive/v2/files/" + fileId + "?uploadType=media", true);
        ajax.setRequestHeader('Content-Type', mimeType);
        ajax.setRequestHeader('Authorization', 'Bearer ' + accessToken);
        ajax.send(data);
    });
}

function DeleteFileOnDrive(fileId)
{
    return new Promise(function(resolve, reject){
        var ajax = new XMLHttpRequest();
        ajax.onreadystatechange = function() {
            if(this.readyState == 4){
                if(this.status == 200)
                {
                    resolve(JSON.parse(this.responseText));
                }
                else
                {
                    reject(Error(JSON.stringify({status: this.status, response: this.responseText})));
                }
            }
        };

        ajax.open("DELETE",
            "https://www.googleapis.com/drive/v2/files/" + fileId, true);
        ajax.setRequestHeader('Authorization', 'Bearer ' + accessToken);
        ajax.send();
    });
}

// This assumes that access token is valid.
function GetFileList(onsuccess, onerror)
{
    return new Promise(function(resolve, reject){
        var ajax = new XMLHttpRequest();
        ajax.onreadystatechange = function() {
            if(this.readyState == 4){
                if(this.status == 200)
                {
                    resolve(JSON.parse(this.responseText).items);
                }
                else
                {
                    reject(Error(JSON.stringify({status: this.status, response: this.responseText})));
                }
            }
        };
        
        ajax.open("GET", "https://www.googleapis.com/drive/v2/files", true);
        ajax.setRequestHeader('spaces', 'appDataFolder');
        ajax.setRequestHeader('Authorization', 'Bearer ' + accessToken);
        ajax.send();
    });
}

function GetFileData(fileId)
{
    return new Promise(function(resolve, reject){
        var ajax = new XMLHttpRequest();
        ajax.onreadystatechange = function() {
            if(this.readyState == 4){
                if(this.status == 200)
                {
                    resolve(this.responseText);
                }
                else
                {
                    reject(Error(JSON.stringify({status: this.status, response: this.responseText})));
                }
            }
        };
        
        ajax.open("GET", "https://www.googleapis.com/drive/v2/files/" + fileId + "?alt=media", true);
        ajax.setRequestHeader('Authorization', 'Bearer ' + accessToken);
        ajax.send();
    });
}
