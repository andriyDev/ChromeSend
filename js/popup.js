
var accessToken;
var devices;
var deviceNames;

function updateContextMenus()
{
    chrome.runtime.sendMessage({greeting: "update"});
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
                        devices = newDevices;
                        deviceNames = new Array();
                        devices.forEach(function(elem){
                            deviceNames.push(elem.name);
                        });
                        populateDeviceLists();
                        if(deviceNames.indexOf(name) == -1)
                        {
                            EditFileOnDrive(name, "", "text/plain", true).then(function(){
                                $('#deviceName').append(name);
                                $('#readyToSend').show();
                                updateContextMenus();
                            });
                        }
                        else
                        {
                            $('#deviceName').append(name);
                            $('#readyToSend').show();
                            updateContextMenus();
                        }
                    });
                }, function(){
                    updateDeviceList().then(function(newDevices){
                        devices = newDevices;
                        deviceNames = new Array();
                        devices.forEach(function(elem){
                            deviceNames.push(elem.name);
                        });
                        populateDeviceLists();
                        $('#needsUserName').show();
                    });
                });
            }
        }
        );
    }
}

function populateDeviceLists()
{
    var list = $('#deviceList').add('#readyDeviceList');
    list.empty();
    devices.forEach(function(elem){
        list.append("<div>" + elem.name + "</div>");
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
                EditFileOnDrive(name, "", 'text/plain', true).then(function(){
                    $('#needsUserName').hide();
                    $('#deviceName').append(name);
                    $('#readyToSend').show();
                    updateContextMenus();
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
    $('#testing').hide();

    authorize(false);

    $('#authorize-button').click(function(e){ authorize(true); });
    $('#username').keypress(function(e){ editingName(); });
    $('#sendUser').click(function(e){ completeName(); });
    $('#save').click(function(e){ save(); });
    $('#load').click(function(e){ load(); });
});
