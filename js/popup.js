
var accessToken;
var devices;

function authorize(interactive)
{
    if(!accessToken)
    {
        chrome.identity.getAuthToken({interactive: interactive}, function(token) {
            if (token) {
                accessToken = token;
            
                $('#needsAuth').hide();
                getStoredDeviceName().then(function(name){
                    $('#deviceName').append(name);
                    $('#readyToSend').show();
                }, function(){
                    updateDeviceList().then(function(){
                        $('#needsUserName').show();
                    });
                });
            }
        }
        );
    }
}

function getStoredDeviceName()
{
    return new Promise(function(resolve, reject){
        chrome.storage.local.get("deviceName", function(name){
            if(chrome.runtime.lasterror)
            {
                reject(Error(chrome.runtime.lastError));
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
                reject(Error(chrome.runtime.lasterror));
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
        $('#deviceList').empty();
        GetFileList().then(function(items){
            devices = new Array();
            items.forEach(function(elem){
                $('#deviceList').append("<div>" + elem.title + "</div>");
                devices.push(elem.title);
            });
            resolve();
        }, function(err){
            $('#deviceList').append("<span style='color: red'>Failed to update the device list.</span>");
            reject(err);
        });
    });
}

// This assumes that access token is valid.
function EditFileOnDrive(filename, fileData, mimetype, createfile)
{
    return new Promise(function(resolve, reject){
        var ajax = new XMLHttpRequest();
        ajax.onreadystatechange = function() {
            if(this.readyState == 4){
                if(this.status == 200)
                {
                    resolve();
                }
                else
                {
                    reject(Error({status: this.status, response: this.responseText}));
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

        ajax.open(createfile ? "POST" : "PUT",
            "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart", true);
        ajax.setRequestHeader('Content-Type', 'multipart/related; boundary=UploadBoundary');
        ajax.setRequestHeader('Authorization', 'Bearer ' + accessToken);
        ajax.send(uploadBody);
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
                    reject(Error({status: this.status, response: this.responseText}));
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
                    reject(Error({status: this.status, response: this.responseText}));
                }
            }
        };
        
        ajax.open("GET", "https://www.googleapis.com/drive/v2/files/" + fileId + "?alt=media", true);
        ajax.setRequestHeader('Authorization', 'Bearer ' + accessToken);
        ajax.send();
    });
}

function editingName()
{
    $('#sendUser').prop('disabled', devices.indexOf($('#username').val()) != -1);
}

function completeName()
{
    if(devices.indexOf($('#username').val()) == -1)
    {
        setStoredDeviceName($('#username').val()).then(function(){
            $('#needsUserName').hide();
            $('#deviceName').append($('#username').val());
            $('#readyToSend').show();
        }, function(err) {
            $('changeDeviceNameStatus').empty().append("<span style='color:red'>Failed to update device name!</span>");
        });
    }
    else
    {
        $('changeDeviceNameStatus').empty().append("<span style='color:red'>Device name is not unique!</span>");
    }
}

function save()
{
    if(accessToken)
    {
        document.getElementById("saveResult").innerHTML = "Uploading...";
        EditFileOnDrive("ChromeSend.db", "Hey demons it's ya boi Andriy", "text/plain", true).then(
            function(){
                document.getElementById("saveResult").innerHTML = "Success!";
            }, function(status, response){
                document.getElementById("saveResult").innerHTML = "Failed!";
            }
        );
    }
}

function load()
{
    if(accessToken)
    {
        GetFileList().then(function(resp){
            if(resp.items.length == 0)
            {
                console.log("No Items!");
                return;
            }
            GetFileData(resp.items[0].id).then(function(data){
                console.log(data);
            }, function(status, response){
                console.error("Failed!");
            });
        }, function(status, response){
            console.error("Failed!");
        });
    }
}

document.addEventListener("DOMContentLoaded", function(e){
    
    $('#needsAuth').show();
    $('#needsUserName').hide();
    $('#readyToSend').hide();
    $('#testing').hide();

    authorize(false);

    $('#authorize-button').click(function(e){ authorize(true); });
    $('#username').keypress(function(e){ editingName(); });
    $('#sendUser').click(function(e){ completeName(); });
    $('#save').click(function(e){ save(); });
    $('#load').click(function(e){ load(); });
});
