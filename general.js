var parametros = {
  unsuscriber: [],
  misdatos: null,
  db: null,
  funciones: null,
  uid: null,
};
var eventoNuevoMensaje = null;

var rutas = {};

function reload(){
    var lng = parametros.unsuscriber.length;
    for(let i=0;i<lng;i++){
        parametros.unsuscriber[i]();
    }
    parametros.unsuscriber = [];
    eventoNuevoMensaje = null;
    var url = decodeURI(window.location.hash);
    var vecUrl = url.split('/');
    if (vecUrl.length===0 || (vecUrl.length===1 && vecUrl[0]==="")){
        window.location.href="#menu";
    } else {
        rutas[vecUrl[0].replace("#","")](vecUrl);
    }
}

function sendTokenToServer(token){
    if (parametros.misdatos.token === token){
        return;
    }
    var db = parametros.db;
    db.collection("misdatos").doc(parametros.uid).update({
        token: token,
    }).then(function(docRef){
        parametros.misdatos.token = token;
    }).catch(function(error){
        M.toast({html:"Error agregando token: " + error});
    });
}

function deleteTokenToServer(){
    if (parametros.misdatos.token === ""){
        return;
    }
    var db = parametros.db;
    db.collection("misdatos").doc(parametros.uid).update({
        token: "",
    }).then(function(docRef){
        parametros.misdatos.token = "";
    }).catch(function(error){
        M.toast({html:"Error agregando clase: " + error});
    });
}

function deleteToken() {
    if (!firebase.messaging.isSupported()){
        return;
    }
    var messaging = firebase.messaging();
    messaging.getToken().then((currentToken) => {
        messaging.deleteToken(currentToken).then(() => {
            deleteTokenToServer();
        }).catch((err) => {
            console.log('Unable to delete token. ', err);
        });
     }).catch((err) => {
        console.log('Error retrieving Instance ID token. ', err);
    });
}

function setMensajeria(){
    if (!firebase.messaging.isSupported()){
        M.toast({html:'Por el momento IPhone no cuenta con notificaciones.'});
        return;
    }
    var messaging = firebase.messaging();
    messaging.getToken().then((currentToken) => {
        if (currentToken) {
            sendTokenToServer(currentToken);
        } else {
            console.log('No Instance ID token available. Request permission to generate one.');
        }
    }).catch((err) => {
        console.log('An error occurred while retrieving token. ', err);
    });
    messaging.onTokenRefresh(() => {
        messaging.getToken().then((refreshedToken) => {
            sendTokenToServer(refreshedToken);
        }).catch((err) => {
            console.log('no refresh token');
        });
    });
    messaging.onMessage((payload) => {
        var remitente = payload.data.remi;
        var url = decodeURI(window.location.hash);
        if (url === "#chat/"+remitente || url === "#chatt/"+remitente){
            return;
        }
        M.toast({html:'Llegó una notificación:'});
    });
}

function authinit(){
  firebase.auth().onAuthStateChanged(function(usuario) {
    if (usuario) {
      parametros.uid = firebase.auth().currentUser.uid;
      var db = parametros.db;
      db.collection("misdatos").doc(parametros.uid).get().then(doc => {
        if (doc.exists) {
          if (parametros.misdatos === null){
            parametros.misdatos = doc.data();
            setMensajeria();
            reload();
          } else {
            parametros.misdatos = doc.data();
          }
        } else {
            
        }
      });
    } else {
      window.location.href = "/";  
    }
  });
}

window.onload = function(){
    parametros.db = firebase.firestore();
    parametros.funciones = firebase.functions();
    authinit();
    reload();
    window.onhashchange = reload;
};
