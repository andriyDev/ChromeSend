
var accessToken;
var thisDeviceId;
var thisDeviceName;
var devices;
var deviceNames;

function updateContextMenus()
{
    chrome.runtime.sendMessage({greeting: "update"});
}

function openTabs()
{
    GetFileData(thisDeviceId).then(function(data){
        data.split('\n').forEach(function(elem){
            if(elem != "")
            {
                chrome.tabs.create({url: elem, active: false})
            }
        });
        UpdateFileOnDrive(thisDeviceId, "", "text/plain").then(function(){
            
        }, function(err){
            console.error(err);
        });
    }, function(err){
        console.error(err);
    });
}

function authorize(interactive)
{
    if(!accessToken)
    {
        chrome.identity.getAuthToken({interactive: interactive}, function(token) {
            if (token) {
                accessToken = token;
            
                $('#needsAuth').hide();
                getStoredDeviceName().then(function(name){
                    updateDeviceList().then(function(newDevices){
                        thisDeviceName = name;
                        applyDeviceList(newDevices);
                        if(deviceNames.indexOf(name) == -1)
                        {
                            $('#needsUserName').show();
                            clearStoredDeviceName().then(function(){
                                thisDeviceName = undefined;
                                thisDeviceId = undefined;
                                reject(Error("Invalid device name."));
                            }, function(err){
                                reject(Error("Invalid device name."));
                            });
                        }
                        else
                        {
                            $('#deviceName').append(name);
                            $('#readyToSend').show();
                            updateContextMenus();
                            openTabs();
                        }
                    });
                }, function(){
                    thisDeviceId = undefined;
                    thisDeviceName = undefined;
                    updateDeviceList().then(function(newDevices){
                        applyDeviceList(newDevices);
                        $('#needsUserName').show();
                    });
                });
            }
        }
        );
    }
}

function applyDeviceList(newDevices)
{
    devices = newDevices;
    deviceNames = new Array();
    devices.forEach(function(elem){
        if(elem.name == thisDeviceName)
        {
            thisDeviceId = elem.id;
        }
        deviceNames.push(elem.name);
    });
    populateDeviceLists();
}

function populateDeviceLists()
{
    var list = $('.deviceList');
    list.empty();
    devices.forEach(function(elem){
        if(elem.id != thisDeviceId)
        {
            list.append("<li class='list-group-item'>" + elem.name + "</li>");
        }
    });

    list = $('#deleteDevice');
    list.empty();
    devices.forEach(function(elem){
        if(elem.id != thisDeviceId)
        {
            list.append("<div class='deleteElem'><div>" + elem.name + "</div><input id='delete" + elem.id + "' type='button' value='Delete'></div>");
            $('#delete' + elem.id).click(function(e){
                deleteDevice(e.target.id.substring(6));
            });
        }
    });
}

function deleteSelf()
{
    if(thisDeviceId)
    {
        deleteDevice(thisDeviceId);
        thisDeviceId = undefined;
        thisDeviceName = undefined;
        clearStoredDeviceName().then(function(){
            $('#needsAuth').show();
            $('#needsUserName').hide();
            $('#readyToSend').hide();

            $('#readyIdle').show();
            $('#readySettings').hide();

            accessToken = undefined;

            authorize(false);
        }, function(err){
            console.error(err);
        });
    }
}

function deleteDevice(id)
{
    DeleteFileOnDrive(id).then(function(){
        updateDeviceList().then(function(newDevices){
            applyDeviceList(newDevices);
            populateDeviceLists();
        }, function(err){
            console.error(err);
        });
    }, function(err){
        console.error(err);
    });
}

function editingName()
{
    $('#sendUser').prop('disabled', devices.indexOf($('#username').val()) != -1);
}

function completeName()
{
    $('#changeDeviceNameStatus').empty();
    if(accessToken)
    {
        var name = $('#username').val();
        if(deviceNames.indexOf(name) == -1)
        {
            setStoredDeviceName(name).then(function(){
                CreateFileOnDrive(name, "", 'text/plain', true).then(function(file){
                    $('#needsUserName').hide();
                    $('#deviceName').empty().append(name);
                    $('#readyToSend').show();

                    devices.push({name: name, id: file.id});
                    deviceNames.push(name);

                    thisDeviceId = file.id;
                    thisDeviceName = name;

                    populateDeviceLists();
                    
                    updateContextMenus();
                    openTabs();
                }, function (err){
                    $('changeDeviceNameStatus').append("<span style='color:red'>Failed to update device name!</span>");
                });
            }, function(err) {
                $('changeDeviceNameStatus').append("<span style='color:red'>Failed to update device name!</span>");
            });
        }
        else
        {
            $('changeDeviceNameStatus').append("<span style='color:red'>Device name is not unique!</span>");
        }
    }
    else
    {
        $('changeDeviceNameStatus').append("<span style='color:red'>No authorization!</span>");
    }
}

document.addEventListener("DOMContentLoaded", function(e){
    
    $('#needsAuth').show();
    $('#needsUserName').hide();
    $('#readyToSend').hide();

    $('#readyIdle').show();
    $('#readySettings').hide();
    $('#changeDeviceNameStatus').hide();

    authorize(false);

    $('#authorize-button').click(function(e){ authorize(true); });
    $('#username').keypress(function(e){ editingName(); });
    $('#sendUser').click(function(e){ completeName(); });
    $('#readyToggle').click(function(e){ $('#readyIdle').toggle(); $('#readySettings').toggle(); });
    $('#reset').click(function(e){ deleteSelf(); });
});
