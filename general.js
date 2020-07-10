"use strict";
/*global M, firebase*/

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

function actualizarCorreo(usuario){
  var tmpstr = localStorage.getItem('micorreo');
  if (tmpstr){
    var tmp = parseInt(tmpstr,10);
    var ahora = Date.now();
    if (tmp >= ahora){
      return;
    }
  }
  var db = parametros.db;
  db.collection("correo").doc(usuario.email).get().then(doc => {
    if (doc.exists) {
      var datos = doc.data();
      if(datos.displayName !== usuario.displayName || datos.photoURL !== usuario.photoURL){
        db.collection("correo").doc(usuario.email).update({
          displayName: usuario.displayName,
          photoURL: usuario.photoURL,
        }).then(res => {
          localStorage.setItem('micorreo',Date.now()+24*60*60*1000);
        }).catch(err => {
          console.log(err);
        });
      } else {
        localStorage.setItem('micorreo',Date.now()+24*60*60*1000);
      }
    } else {
      db.collection("correo").doc(usuario.email).set({
        displayName: usuario.displayName,
        photoURL: usuario.photoURL,
      }).then(res => {
        localStorage.setItem('micorreo',Date.now()+24*60*60*1000);
      }).catch(err => {
        console.log(err);
      });
    }
  }).catch(err => {
    console.log(err);
  });
}

function actualizarMisDatos(usuario,cb){
  var datstr = localStorage.getItem('misdatos');
  if (datstr){
    var misdatos = JSON.parse(datstr);
    var ahora = Date.now();
    if (misdatos.timeout >= ahora){
      parametros.misdatos = misdatos;
      cb();
      return;
    }
  }
  var db = parametros.db;
  db.collection("misdatos").doc(parametros.uid).get().then(doc => {
    if (doc.exists) {
      var datos = doc.data();
      parametros.misdatos = datos;
      parametros.misdatos.email = usuario.email;
      parametros.misdatos.timeout = Date.now()+24*60*60*1000;
      localStorage.setItem('misdatos',JSON.stringify(parametros.misdatos));
      cb();
    } else {
      var misdatos = {
        token: "",
        invite: [],
        amigos: [],
      };
      db.collection("misdatos").doc(parametros.uid).set(misdatos).then(res => {
        parametros.misdatos = misdatos;
        parametros.misdatos.email = usuario.email;
        parametros.misdatos.timeout = Date.now()+24*60*60*1000;
        localStorage.setItem('misdatos',JSON.stringify(parametros.misdatos));
        cb();
      }).catch(err => {
        console.log(err);
      });
    }
  }).catch(err => {
    console.log(err);
  });
}

function authinit(){
  firebase.auth().onAuthStateChanged(function(usuario) {
    if (usuario) {
      parametros.uid = usuario.uid;
      actualizarCorreo(usuario);
      actualizarMisDatos(usuario,function(){
        setMensajeria();
        reload();
      });
      var db = parametros.db;
    } else {
      window.location.href = "/";
    }
  });
}

window.onload = function(){
    parametros.db = firebase.firestore();
    parametros.funciones = firebase.functions();
    authinit();
    window.onhashchange = reload;
};
