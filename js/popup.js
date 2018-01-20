
var accessToken;

function authorize(interactive)
{
    if(!accessToken)
    {
        chrome.identity.getAuthToken({interactive: interactive}, function(token) {
            if (token) {
                accessToken = token;
            
                console.log("Authenticated!");
                var authbtn = document.getElementById('authorize-button');
                authbtn.parentNode.removeChild(authbtn);
            }
        }
        );
    }
}

function CreateFolderOnDrive(foldername, onsuccess, onerror)
{
    // EditFileOnDrive(foldername, "", "application/vnd.google-aps.folder", onsuccess, onerror);
    var ajax = new XMLHttpRequest();
    ajax.onreadystatechange = function() {
        if(this.readyState == 4){
            if(this.status == 200)
            {
                console.log(this.responseText);
                onsuccess && onsuccess();
            }
            else
            {
                console.log("Here " + this.status + "\n" + this.responseText);
                onerror && onerror(this.status, this.responseText);
            }
        }
    };

    var uploadBody = "";
    uploadBody += "--UploadBoundary\n";
    uploadBody += "Content-type: application/json; charset=UTF-8\n\n";
    uploadBody += JSON.stringify({name: foldername, mimeType: 'application/vnd.google-aps.folder'});
    uploadBody += "\n--UploadBoundary\n";
    uploadBody += "Content-Type: application/vnd.google-aps.folder\n\n";
    uploadBody += "\n--UploadBoundary--";

    ajax.open("POST",
        "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart", true);
    ajax.setRequestHeader('Content-Type', 'multipart/related; boundary=UploadBoundary');
    ajax.setRequestHeader('Authorization', 'Bearer ' + accessToken);
    ajax.send(uploadBody);
}

// This assumes that access token is valid.
function EditFileOnDrive(filename, fileData, mimetype, createfile, onsuccess, onerror)
{
    var ajax = new XMLHttpRequest();
    ajax.onreadystatechange = function() {
        if(this.readyState == 4){
            if(this.status == 200)
            {
                console.log(this.responseText);
                onsuccess && onsuccess();
            }
            else
            {
                console.log("Here " + this.status + "\n" + this.responseText);
                onerror && onerror(this.status, this.responseText);
            }
        }
    };

    var uploadBody = "";
    uploadBody += "--UploadBoundary\n";
    uploadBody += "Content-type: application/json; charset=UTF-8\n\n";
    uploadBody += JSON.stringify({name: filename});
    uploadBody += "\n--UploadBoundary\n";
    uploadBody += "Content-Type: " + mimetype + "\n\n";
    uploadBody += fileData;
    uploadBody += "\n--UploadBoundary--";

    ajax.open(createfile ? "POST" : "PUT",
        "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart", true);
    ajax.setRequestHeader('Content-Type', 'multipart/related; boundary=UploadBoundary');
    ajax.setRequestHeader('Authorization', 'Bearer ' + accessToken);
    ajax.send(uploadBody);
}

function save()
{
    if(accessToken)
    {
        document.getElementById("saveResult").innerHTML = "Uploading...";
        CreateFolderOnDrive("ChromeSend", function(){
            console.log("Succeeded")
            ;
            EditFileOnDrive("ChromeSend/ChromeSend.db", "Hey demons it's ya boi Andriy", "text/plain", true,
                function(){
                    document.getElementById("saveResult").innerHTML = "Success!";
                }, function(status, response){
                    document.getElementById("saveResult").innerHTML = "Failed!";
                }
            );
        }, function(status, response){
            console.error(status);
            console.error(response);
        });
    }
}

function load()
{
    if(accessToken)
    {
        
    }
}

document.addEventListener("DOMContentLoaded", function(e){
    var authButton = document.getElementById('authorize-button');
    authButton.addEventListener('click', function(e){
        authorize(true);
    });
    authorize(false);
    var saveBtn = document.getElementById('save');
    saveBtn.addEventListener('click', function(e){
        save();
    });
    var loadBtn = document.getElementById('load');
    loadBtn.addEventListener('click', function(e){
        load();
    });
});
