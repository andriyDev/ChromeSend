
var gdocs = new GDocs();

function authorize()
{
    if(!gdocs.accessToken)
    {
        gdocs.auth(true, function(){
            console.log("Authenticated!");
        });
    }
}

document.addEventListener("DOMContentLoaded", function(e){
    var authButton = document.getElementById('authorize-button');
    authButton.addEventListener('click', function(e){
        authorize();
    });
});
