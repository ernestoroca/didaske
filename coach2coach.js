"use strict";

var escuchadores = [];
var peerConnection;
var roomId;
var remoteStream;

function datosAmigo(correo,cb){
    var datoStr = localStorage.getItem('datosAmigo-'+correo);
    if (datoStr !== null){
        var ahora = Date.now();
        var dato = JSON.parse(datoStr);
        if (dato.timeout >= ahora){
            cb(dato);
            return;
        }
        localStorage.removeItem('datosAmigo-'+correo);
    }
    var db = parametros.db;
    db.collection("correo").doc(correo).get().then(function(doc) {
        var datos = doc.data();
        datos.correo = correo;
        datos.timeout = Date.now() + 7*24*60*60*1000;
        localStorage.setItem('datosAmigo-'+correo,JSON.stringify(datos));
        cb(datos);
    }).catch(function(error) {
        console.log(error);
    });
}

async function hangUp() {
    if (remoteStream) {
        remoteStream.getTracks().forEach(track => track.stop());
        remoteStream = null;
    }
    
    if (peerConnection) {
        peerConnection.close();
        peerConnection = null;
    }
    
    // Delete room on hangup
    if (roomId) {
        const db = firebase.firestore();
        const roomRef = db.collection('rooms').doc(roomId);
        const calleeCandidates = await roomRef.collection('calleeCandidates').get();
        calleeCandidates.forEach(async candidate => {
            await candidate.ref.delete();
        });
        const callerCandidates = await roomRef.collection('callerCandidates').get();
        callerCandidates.forEach(async candidate => {
            await candidate.ref.delete();
        });
        await roomRef.delete();
        roomId = null;
    }
    if (escuchadores.length>0){
        let lng = escuchadores.length;
        for(let i=0;i<lng;i++){
            escuchadores[i]();
        }
        escuchadores = [];
    }
    db.collection("publica").doc(parametros.misdatos.email).delete().then(res => {
    }).catch(err => {
        console.log(err);
    });
    if (localStorage.getItem("invitado") !== null){
        db.collection("directa").doc(localStorage.getItem("invitado")).collection("invitador").doc(parametros.misdatos.email).delete().then(res => {
            localStorage.removeItem("invitado");
        }).catch(err => {
            console.log(err);
        });
    }
}

//------------------------------------------------------------------------------------------------------

rutas = {};

rutas.menu = function(){
    var strHtml;
    {strHtml = `
<div class="row">
  <div class="col s12">
    <h4>Coach 2 Coach</h4>
  </div>
</div>
<div class="row orange z-depth-2" onclick="window.location.href='#coach'">
  <div class="col s12 white-text">
    <h5>Coach</h5>
  </div>
</div>
<div class="row orange z-depth-2" onclick="window.location.href='#coachee'">
  <div class="col s12 white-text">
    <h5>Coachee</h5>
  </div>
</div>
<div class="row orange z-depth-2" onclick="window.location.href='#amigos'">
  <div class="col s12 white-text">
    <h5>Mis Amigos</h5>
  </div>
</div>
    `;}
    document.getElementById("contenedor").innerHTML = strHtml;
};

//---------------------------------------------------------------------------------------------------------------

rutas.amigos = function(){
    var strHtml;
    {strHtml = `
<div class="row">
  <div class="col s12">
    <h4>Mis Amigos</h4>
  </div>
</div>
<div class="row">
  <div class="col s12">
    <ul class="collapsible">
      <li>
        <div class="collapsible-header orange white-text">
          <i class="material-icons">filter_drama</i>
          <b>Solicitudes</b>
        </div>
        <div class="collapsible-body">
          <table class="striped">
            <thead>
              <tr>
                <th>Correo</th>
                <th></th>
                <th></th>
              </tr>
            </thead>
            <tbody id="solicitudes">
            </tbody>
          </table>
        </div>
      </li>
      <li>
        <div class="collapsible-header orange white-text">
          <i class="material-icons">place</i>
          <b>Mis amistades</b>
        </div>
        <div class="collapsible-body">
          <ul class="collection" id="amistades"></ul>
        </div>
      </li>
      <li>
        <div class="collapsible-header orange white-text">
          <i class="material-icons">whatshot</i>
          <b>Nueva amistad</b>
        </div>
        <div class="collapsible-body">
          <div class="row">
            <div class="input-field col s12">
              <i class="material-icons prefix">account_circle</i>
              <input id="correo" type="email" class="validate">
              <label for="correo">Gmail</label>
            </div>
          </div>
          <div class="row">
            <div class="col s12">
              <a id="enviar" class="waves-effect waves-light btn right orange"><i class="material-icons left">send</i>Enviar</a>
            </div>
          </div>
        </div>
      </li>
    </ul>
  </div>
</div>
<div id="modal1" class="modal">
  <div class="modal-content">
    <h4>Borrar Amigo</h4>
    <p>¿Está seguro de querer eliminar este amigo?</p>
  </div>
  <div class="modal-footer">
    <a class="modal-close waves-effect waves-green btn-flat">Cancelar</a>
    <a id="borrar" class="modal-close waves-effect waves-green btn-flat orange">BORRAR</a>
  </div>
</div>
    `;}
    document.getElementById("contenedor").innerHTML = strHtml;
    M.updateTextFields();
    M.Collapsible.init(document.querySelectorAll('.collapsible'));
    M.Modal.init(document.querySelectorAll('.modal'));

    var db = parametros.db;
    
    document.getElementById("enviar").onclick = function(){
        var correo = document.getElementById("correo").value;
        correo = correo.trim();
        if (correo === ""){
            return;
        }
        correo = correo.toLowerCase();
        var vcorreo = correo.split("@");
        if (vcorreo.length !== 2){
            return;
        }
        if (vcorreo[1] !== "gmail.com"){
            return;
        }
        
        if (parametros.misdatos.invite.indexOf(correo)>=0){
            return;
        }
        
        document.getElementById("correo").value = "";
        var db = parametros.db;
        db.collection("correo").doc(correo).get().then(doc => {
            if (doc.exists) {
                return db.collection("invitacion").doc(correo).collection('invitador').doc(parametros.misdatos.email).set({
                    fecha: Date.now(),
                });
            } else {
                throw "Esta persona no es miembro de Didaske. ¡Invitala!";
            }
        }).then(res => {
            return db.collection("misdatos").doc(parametros.uid).update({
                invite: firebase.firestore.FieldValue.arrayUnion(correo),
            });
        }).then(res => {
            parametros.misdatos.invite.push(correo);
            localStorage.setItem('misdatos',JSON.stringify(parametros.misdatos));
            M.toast({html: "Solicitud enviada"});
        }).catch(function(error){
            M.toast({html: error});
        });
    };
    
    document.getElementById("solicitudes").onclick = function(evento){
        var destino = evento.target;
        var id = destino.id;
        while(id === ""){
            destino = destino.parentElement;
            id = destino.id;
        }
        if (id.includes("aceptar-")){
            id = id.replace("aceptar-","");
            db.collection("misdatos").doc(parametros.uid).update({
                amigos: firebase.firestore.FieldValue.arrayUnion(id),
            }).then(res => {
                parametros.misdatos.amigos.push(id);
                localStorage.setItem('misdatos',JSON.stringify(parametros.misdatos));
            }).catch(err => {
                console.log(err);
            });

            db.collection("aceptacion").doc(id).collection('aceptador').doc(parametros.misdatos.email).set({
                fecha: Date.now(),
            });
        } else if (id.includes("rechazar-")){
            id = id.replace("rechazar-","");
        } else {
            return;
        }
        db.collection("invitacion").doc(parametros.misdatos.email).collection('invitador').doc(id).delete().then(() => {
            getSolicitudes();
        }).catch(function(error) {
            console.error("Error removing document: ", error);
        });
    };
    function printSolicitud(correo,dato){
        if (parametros.misdatos.amigos.indexOf(correo) >= 0){
            db.collection("invitacion").doc(parametros.misdatos.email).collection('invitador').doc(correo).delete().then(() => {
                console.log("Document successfully deleted!");
            }).catch(function(error) {
                console.error("Error removing document: ", error);
            });
            return;
        }
        var tr = document.createElement("TR");
        var strHtml;
        {strHtml = `
<td>${correo}</td>
<td><a id="aceptar-${correo}" class="waves-effect waves-teal btn-flat"><i class="material-icons right">check</i></a></td>
<td><a id="rechazar-${correo}" class="waves-effect waves-red btn-flat"><i class="material-icons right">delete</i></a></td>
        `;}
        tr.innerHTML = strHtml;
        document.getElementById("solicitudes").appendChild(tr);
    }
    function getSolicitudes(){
        document.getElementById("solicitudes").innerHTML = "";
        db.collection("invitacion").doc(parametros.misdatos.email).collection('invitador').get().then(querySnapshot => {
          querySnapshot.forEach(doc => {
            printSolicitud(doc.id,doc.data());
          });
        }).catch(function(error) {
          console.log("Error getting documents: ", error);
        });
    }
    function agregarAmigo(correo,dato){
        if (parametros.misdatos.amigos.indexOf(correo)<0){
            db.collection("misdatos").doc(parametros.uid).update({
                amigos: firebase.firestore.FieldValue.arrayUnion(correo),
            }).then(res => {
                parametros.misdatos.amigos.push(correo);
                var pos = parametros.misdatos.invite.indexOf(correo);
                if (pos>=0){
                    parametros.misdatos.invite.splice(pos,1);
                }
                localStorage.setItem('misdatos',JSON.stringify(parametros.misdatos));
            }).catch(err => {
                console.log(err);
            });
        }
        db.collection("invitacion").doc(parametros.misdatos.email).collection('invitador').doc(correo).delete().then(() => {
        }).catch(function(error) {
            console.error("Error removing document: ", error);
        });
    }
    function getAceptaciones(){
        var handler = null;
        db.collection("aceptacion").doc(parametros.misdatos.email).collection('aceptador').get().then(querySnapshot => {
          querySnapshot.forEach(doc => {
            agregarAmigo(doc.id,doc.data());
            if (handler === null){
                handler = setTimeout(getAmistades,5000);
            }
          });
        }).catch(function(error) {
          console.log("Error getting documents: ", error);
        });
    }
    function anularAmigo(correo,dato){
        if (parametros.misdatos.amigos.indexOf(correo) >= 0){
            db.collection("misdatos").doc(parametros.uid).update({
                amigos: firebase.firestore.FieldValue.arrayRemove(correo),
            }).then(res => {
                var pos = parametros.misdatos.amigos.indexOf(correo);
                if (pos>=0){
                    parametros.misdatos.amigos.splice(1,0);
                }
                localStorage.setItem('misdatos',JSON.stringify(parametros.misdatos));
            }).catch(err => {
                console.log(err);
            });
        }
        db.collection("anulacion").doc(parametros.misdatos.email).collection('anulador').doc(correo).delete().then(() => {
        }).catch(function(error) {
            console.error("Error removing document: ", error);
        });
    }
    function getAnulaciones(){
        var handler = null;
        db.collection("anulacion").doc(parametros.misdatos.email).collection('anulador').get().then(querySnapshot => {
          querySnapshot.forEach(doc => {
            anularAmigo(doc.id,doc.data());
            if (handler === null){
                handler = setTimeout(getAmistades,5000);
            }
          });
        }).catch(function(error) {
          console.log("Error getting documents: ", error);
        });
    }
    getAnulaciones();
    getSolicitudes();
    getAceptaciones();
    
    var correoBorrar = "";
    document.getElementById("borrar").onclick = function(){
        if(correoBorrar === ""){
            return;
        }
        var elCorreo = correoBorrar.slice();
        correoBorrar = "";
        if (parametros.misdatos.amigos.indexOf(elCorreo)>=0){
            db.collection("misdatos").doc(parametros.uid).update({
                amigos: firebase.firestore.FieldValue.arrayRemove(elCorreo),
            }).then(res => {
                var pos = parametros.misdatos.amigos.indexOf(elCorreo);
                parametros.misdatos.amigos.splice(pos,1);
                localStorage.setItem('misdatos',JSON.stringify(parametros.misdatos));
                getAmistades();
            }).catch(err => {
                console.log(err);
            });
            
            db.collection("anulacion").doc(elCorreo).collection('anulador').doc(parametros.misdatos.email).set({
                fecha: Date.now(),
            });
        }
    };
    document.getElementById("amistades").onclick = function(evento){
        var destino = evento.target;
        var id = destino.id;
        while(id === ""){
            destino = destino.parentElement;
            id = destino.id;
        }
        if (id.includes("borrar-")){
            id = id.replace("borrar-","");
            M.Modal.getInstance("modal1").open();
            correoBorrar = id;
        }
    };
    function getAmistades(){
        var guardar = false;
        document.getElementById("amistades").innerHTML = "";
        var lng = parametros.misdatos.amigos.length;
        for(let i=0;i<lng;i++){
            datosAmigo(parametros.misdatos.amigos[i],imprimirAmigo);
            var pos = parametros.misdatos.invite.indexOf(parametros.misdatos.amigos[i]);
            if (pos>=0){
                parametros.misdatos.invite.splice(pos,1);
                guardar = true;
            }
        }
        if(guardar){
            db.collection("misdatos").doc(parametros.uid).update({
                invite: parametros.misdatos.invite,
            }).then(res => {
                localStorage.setItem('misdatos',JSON.stringify(parametros.misdatos));
            }).catch(err => {
                console.log(err);
            });
        }
    }
    function imprimirAmigo(datos){
        var li = document.createElement("LI");
        li.classList.add("collection-item","avatar","orange","lighten-4");
        var strHtml;
        {strHtml = `
<img src="${datos.photoURL}" alt="" class="circle">
<span class="title">${datos.displayName}</span>
<p>${datos.correo}<p>
<a id="borrar-${datos.correo}" class="secondary-content"><i class="material-icons green-text">delete</i></a>
        `;}
        li.innerHTML = strHtml;
        document.getElementById("amistades").appendChild(li);
    }
    getAmistades();
};

//------------------------------------------------------------------------------------------------------------

rutas.coach = function(){
    var strHtml;
    {strHtml = `
<div class="row">
  <div class="col s12">
    <h4>Coach</h4>
  </div>
</div>
<ul class="collapsible orange z-depth-2">
  <li>
    <div class="collapsible-header orange white-text" onclick="window.location.href="#publica">
      <i class="material-icons">filter_drama</i>
      <b>Invitación Pública</b>
    </div>
  </li>
</ul>
<ul class="collapsible orange z-depth-2">
  <li>
    <div class="collapsible-header orange white-text">
      <i class="material-icons">filter_drama</i>
      <b>Invitación Privada</b>
    </div>
    <div class="collapsible-body">
      <ul class="collection" id="amistades">
      </ul>
      <div class="row">
        <div class="col s6">
          <a id="izquierda" class="waves-effect waves-light btn"><i class="material-icons left">chevron_left</i></a>
        </div>
        <div class="col s6">
          <a id="derecha" class="waves-effect waves-light btn"><i class="material-icons right">chevron_right</i></a>
        </div>
      </div>
    </div>
  </li>
</ul>
    `;}
    document.getElementById("contenedor").innerHTML = strHtml;
    M.Collapsible.init(document.querySelectorAll('.collapsible'));
    
    document.getElementById("izquierda").onclick = function(){
        if (pagina === 0){
            return;
        }
        pagina--;
        showPagina();
    };
    document.getElementById("derecha").onclick = function(){
        if (pagina === max){
            return;
        }
        pagina++;
        showPagina();
    };
    
    function imprimirAmigo(datos){
        var li = document.createElement("LI");
        li.classList.add("collection-item","avatar","orange","lighten-4");
        var strHtml;
        {strHtml = `
    <img src="${datos.photoURL}" alt="" class="circle">
    <span class="title">${datos.displayName}</span>
    <p>${datos.correo}<p>
    <a href="#directa/${datos.correo}" class="secondary-content"><i class="material-icons green-text">check</i></a>
        `;}
        li.innerHTML = strHtml;
        document.getElementById("amistades").appendChild(li);
    }
    function showPagina(){
        var i;
        var vector = parametros.misdatos.amigos;
        var lng = vector.length;
        for(i=0;i<10 && (pagina*10 + i)<lng;i++){
            datosAmigo(vector[i],imprimirAmigo);
        }
    }
    
    parametros.misdatos.amigos.sort(function(a,b){
       return a>b ? +1 : -1;
    });
    var pagina = 0;
    var max = Math.floor(parametros.misdatos.amigos.length/10);
    showPagina();
};

//------------------------------------------------------------------------------------------------------------

rutas.publica = function(){
    var strHtml;
    {strHtml = `
  <div class="row">
    <div class="col s12 m6">
      <div class="card orange">
        <div class="card-content white-text">
          <span class="card-title">En espera de Coachee</span>
          <p>Mantenga esta ventana abierta</p>
          <p>Si sale de esta ventana, se retirará de la lista de Coachs</p>
        </div>
        <div class="card-action">
          <a href="#menu">Salir</a>
        </div>
      </div>
    </div>
  </div>
    `;}
    document.getElementById("contenedor").innerHTML = strHtml;
    
    var db = parametros.db;
    var docRef = db.collection("publica").doc(parametros.misdatos.email);
    docRef.set({
        sala: "",
    }).then(res => {
        var escuchador = docRef.onSnapshot(doc => {
            var datos = doc.data();
            if (datos.sala!==""){
                window.location.href = "#sala/"+datos.sala;
            }
        });
        escuchadores.push(escuchador);
    }).catch(err => {
        console.log(err);
    });
};

//------------------------------------------------------------------------------------------------------------

rutas.directa = function(vecUrl){
    var coachee = vecUrl[1];
    var strHtml;
    {strHtml = `
  <div class="row">
    <div class="col s12 m6">
      <div class="card orange">
        <div class="card-content white-text">
          <span class="card-title">En espera de Coachee</span>
          <div class="row">
            <div class="col s3">
              <img class="responsive-img" id="photoURL">
            </div>
            <div class="col s9">
              <p id="displayName"></p>
              <p>${coachee}</p>
            </div>
          </div>
          <p>Mantenga esta ventana abierta</p>
          <p>Si sale de esta ventana, se retirará de la lista de Coachs</p>
        </div>
        <div class="card-action">
          <a href="#menu">Salir</a>
        </div>
      </div>
    </div>
  </div>
    `;}
    document.getElementById("contenedor").innerHTML = strHtml;
    datosAmigo(coachee,imprimirAmigo);
    function imprimirAmigo(datos){
        document.getElementById("photoURL").src = datos.photoURL;
        document.getElementById("displayName").innerHTML = datos.displayName;
    }
    
    var db = parametros.db;
    var docRef = db.collection("directa").doc(coachee).collection("invitador").doc(parametros.misdatos.email);
    docRef.set({
        sala: "",
    }).then(res => {
        var escuchador = docRef.onSnapshot(doc => {
            var datos = doc.data();
            if (datos.sala !== ""){
                window.location.href = "#sala/"+datos.sala;
            }
        });
        escuchadores.push(escuchador);
        localStorage.setItem("invitado",coachee);
    }).catch(err => {
        console.log(err);
    });
};

//------------------------------------------------------------------------------------------------------------

rutas.coachee = function(){
    var strHtml;
    {strHtml = `
<div class="row">
  <div class="col s12">
    <h4>Selecciona tu Coach</h4>
  </div>
</div>
<ul class="collection" id="lista">
</ul>
    `;}
    document.getElementById("contenedor").innerHTML = strHtml;
    var db = parametros.db;
    db.collection("directa").doc(parametros.misdatos.email).collection("invitador").get().then(querySnapshot => {
        if (querySnapshot.empty){
            buscarPublicas();
        } else {
            var lngDoc  = querySnapshot.size;
            var contador = 0;
            var buscar = true;
            querySnapshot.forEach(doc => {
                var datos = doc.data();
                if (datos.sala === ""){
                    datosAmigo(doc.id,imprimirDirecta);
                    buscar = false;
                }
                contador++;
                if (buscar && contador === lngDoc){
                    buscarPublicas();
                }
            });
        }
    }).catch(function(error) {
        console.log("Error getting documents: ", error);
    });
    function buscarPublicas(){
        db.collection("publica").where("sala", "==", "").limit(10).get().then(querySnapshot => {
            if (querySnapshot.empty){
                document.getElementById("lista").innerHTML = `<li class="collection-item">No hay Coaches disponibles</li>`;
                setTimeout(function(){
                    window.location.href = "#menu";
                },5000);
            } else {
                querySnapshot.forEach(doc => {
                    datosAmigo(doc.id,imprimirPublica);
                });
            }
        }).catch(function(error) {
            console.log("Error getting documents: ", error);
        });
    }
    function imprimirDirecta(datos){
        var li = document.createElement("LI");
        li.classList.add("collection-item","avatar","orange","lighten-4");
        var strHtml;
        {strHtml = `
    <img src="${datos.photoURL}" alt="" class="circle">
    <span class="title">${datos.displayName}</span>
    <p>${datos.correo}<p>
    <p><b>¡INVITACION!</b><p>
    <a href="#setsala/${datos.correo}/directa" class="secondary-content"><i class="material-icons green-text">check</i></a>
        `;}
        li.innerHTML = strHtml;
        document.getElementById("lista").appendChild(li);
    }
    function imprimirPublica(datos){
        var li = document.createElement("LI");
        li.classList.add("collection-item","avatar","orange","lighten-4");
        var strHtml;
        {strHtml = `
    <img src="${datos.photoURL}" alt="" class="circle">
    <span class="title">${datos.displayName}</span>
    <p>${datos.correo}<p>
    <a href="#setsala/${datos.correo}/publica" class="secondary-content"><i class="material-icons green-text">check</i></a>
        `;}
        li.innerHTML = strHtml;
        document.getElementById("lista").appendChild(li);
    }
};

//------------------------------------------------------------------------------------------------------------

rutas.setsala = function(vecUrl){
    var coach = vecUrl[1];
    var tipo = vecUrl[2];
    
    var strHtml, roomRef,refDoc,localStream;
    var db = parametros.db;
    {strHtml= `
<div class="row">
  <div class="col s12">
    <h4 id="estado">Esperando al Coach</h4>
  </div>
</div>
<div class="row">
  <div class="col s4">
    <img class="responsive-img" src="" id="photoURL">
  </div>
  <div class="col s8">
    <p id="displayName"></p>
    <p>${coach}</p>
  </div>
</div>
<div class="row">
  <div class="col s12">
    <h4 id="mensaje"></h4>
  </div>
</div>
<div class="row">
  <div class="col s12">
    <a href="#menu" class="waves-effect waves-light btn orange"><i class="material-icons right">close</i>Salir</a>
  </div>
</div>
    `;}
    document.getElementById("contenedor").innerHTML = strHtml;
    datosAmigo(coach,imprimirPersona);
    function imprimirPersona(datos){
        document.getElementById("displayName").innerHTML = datos.displayName;
        document.getElementById("photoURL").src = datos.photoURL;
    }
    
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia){
        navigator.mediaDevices.getUserMedia({video: false, audio: true}).then((stream) => {localStream = stream});
    } else {
        M.toast({
            html: "Su equipo no sporta conferencia",
            completeCallback: function(){window.location.href="#menu";},
        });
        return;
    }
    
    
    if (tipo === "directa"){
        refDoc = db.collection("directa").doc(parametros.misdatos.email).collection("invitador").doc(coach);
    } else {
        refDoc = db.collection("publica").doc(coach);
    }
    refDoc.get().then(doc => {
        if (doc.exists) {
            var data = doc.data();
            if (data.sala !=""){
                M.toast({
                    html: "Ya no existe la reunión.",
                    completeCallback: function(){window.location.href="#menu";},
                });
            } else {
                createRoom();
            }
        } else {
            M.toast({
                html: "Ya no existe la reunión.",
                completeCallback: function(){window.location.href="#menu";},
            });
        }
    }).catch(err => {
        console.log(err);
        M.toast({
            html: "Ya no existe la reunión.",
            completeCallback: function(){window.location.href="#menu";},
        });
    });
    
    function informarSala(salaid){
        refDoc.update({
            sala: salaid
        }).then(res => {
            M.toast({html: "Conexión establecida"});
        }).catch(err => {
            console.log(err);
        });
    }
    
    function imprimirMensaje(mensaje){
        document.getElementById("mensaje").innterHTML = mensaje;
    }
    
    async function createRoom() {
        const configuration = {
            iceServers: [{
                urls: [
                    'stun:stun1.l.google.com:19302',
                    'stun:stun2.l.google.com:19302',
                ]
            }],
            iceCandidatePoolSize: 10,
        };
        roomRef = await db.collection('rooms').doc();
        peerConnection = new RTCPeerConnection(configuration);
        peerConnection.onconnectionstatechange= function(evento){
            if (peerConnection.connectionState == "connected"){
                //?????????????
            }
        };

        localStream.getTracks().forEach(track => {
            peerConnection.addTrack(track, localStream);
        });
        const callerCandidatesCollection = roomRef.collection('callerCandidates');
        
        // Code for collecting ICE candidates below
        peerConnection.addEventListener('icecandidate', event => {
            if (!event.candidate) {
                return;
            }
            callerCandidatesCollection.add(event.candidate.toJSON());
        });
        // Code for collecting ICE candidates above
        
        // Code for creating a room below
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        const roomWithOffer = {
            'offer': {
                type: offer.type,
                sdp: offer.sdp,
            },
            'mansaje': "",
            'correo': parametros.misdatos.email,
        };
        await roomRef.set(roomWithOffer);
        // Code for creating a room above
    
        // Listening for remote session description below
        var escuchador = roomRef.onSnapshot(async snapshot => {
            const data = snapshot.data();
            if (!peerConnection.currentRemoteDescription && data && data.answer) {
                const rtcSessionDescription = new RTCSessionDescription(data.answer);
                await peerConnection.setRemoteDescription(rtcSessionDescription);
                imprimirMensaje(data.mensaje);
            }
        });
        escuchadores.push(escuchador);
        // Listening for remote session description above
    
        // Listen for remote ICE candidates below
        escuchador = roomRef.collection('calleeCandidates').onSnapshot(snapshot => {
            snapshot.docChanges().forEach(async change => {
                if (change.type === 'added') {
                    let data = change.doc.data();
                    await peerConnection.addIceCandidate(new RTCIceCandidate(data));
                }
            });
        });
        escuchadores.push(escuchador);
        // Listen for remote ICE candidates above
        
        //send ID to the other party
        informarSala(roomRef.id);
    }
};

//------------------------------------------------------------------------------------------------------------

rutas.sala = function(vecUrl){
    var roomId = vecUrl[1];
    var roomRef, roomSnapshot,peerConnection;
    var db = firebase.firestore();
    remoteStream = new MediaStream();
    
    var strHtml = `
<div class="row">
  <div class="col s4">
    <img class="responsive-img" src="" id="photoURL">
  </div>
  <div class="col s8">
    <p id="displayName"></p>
    <p id="correo"></p>
  </div>
</div>
    `;
    document.getElementById("contenedor").innerHTML = strHtml;
    
    function enviarMensaje(mensaje){
        roomRef.update({
            mensaje: mensaje,
        });
    }
    function imprimirCoach(datos){
        document.getElementById("photoURL").src = datos.photoURL;
        document.getElementById("displayName").innerHTML = datos.displayName;
        document.getElementById("correo").src = datos.correo;
    }
    
    async function joinRoomById() {
        const configuration = {
            iceServers: [{
                urls: [
                    'stun:stun1.l.google.com:19302',
                    'stun:stun2.l.google.com:19302',
                ]
            }],
            iceCandidatePoolSize: 10,
        };
        roomRef = db.collection('rooms').doc(`${roomId}`);
        roomSnapshot = await roomRef.get();
        if (roomSnapshot.exists) {
            peerConnection = new RTCPeerConnection(configuration);
            
            // Code for collecting ICE candidates below
            const calleeCandidatesCollection = roomRef.collection('calleeCandidates');
            peerConnection.addEventListener('icecandidate', event => {
                if (!event.candidate) {
                    return;
                }
                calleeCandidatesCollection.add(event.candidate.toJSON());
            });
            // Code for collecting ICE candidates above
            
            // Code remoteStream below
            peerConnection.addEventListener('track', event => {
                event.streams[0].getTracks().forEach(track => {
                    remoteStream.addTrack(track);
                });
            });
            // Code remoteStream above
            
            // Code for creating SDP answer below
            const snapData = roomSnapshot.data();
            const offer = snapData.offer;
            datosAmigo(snapData.correo,imprimirCoach);
            await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
            const answer = await peerConnection.createAnswer();
            await peerConnection.setLocalDescription(answer);
            const roomWithAnswer = {
                answer: {
                    type: answer.type,
                    sdp: answer.sdp,
                },
            };
            await roomRef.update(roomWithAnswer);
            // Code for creating SDP answer above
    
            // Listening for remote ICE candidates below
            var escuchador = roomRef.collection('callerCandidates').onSnapshot(snapshot => {
                snapshot.docChanges().forEach(async change => {
                    if (change.type === 'added') {
                        let data = change.doc.data();
                        await peerConnection.addIceCandidate(new RTCIceCandidate(data));
                    }
                });
            });
            escuchadores.push(escuchador);
            // Listening for remote ICE candidates above
            
            
            setInterval(function(){
                enviarMensaje(Math.random());
            }, 5000);
        } else {
            M.toast({
                html: "Ya no existe la reunión.",
                completeCallback: function(){window.location.href="#menu";},
            });
        }
    }
    joinRoomById();
};

//------------------------------------------------------------------------------------------------------------

rutas.xxx = function(){
    var strHtml;
    {strHtml= `
<video id="localVideo" width="320" height="240" muted autoplay playsinline></video>
<video id="remoteVideo" width="320" height="240" autoplay playsinline></video><br>
<button id="open-camera">Mostrar Camara</button><br><br>
<button id="create-room">Crear Sala</button>
<b>Room Id:</b> <span id="room-id-out"></span><br><br><b>
<input id="room-id-in" type="text">
<button id="join-room">Ingresar Sala</button><br><br>
<button id="close-room">Salir Sala</button><br>
<div id="msg-list"></div>
<input id="msg" type="text">
<button id="send-msg">Mensaje</button><br><br>
    `;}
    document.getElementById("contenedor").innerHTML = strHtml;
  
    const configuration = {
        iceServers: [{
            urls: [
                'stun:stun1.l.google.com:19302',
                'stun:stun2.l.google.com:19302',
            ]
        }],
        iceCandidatePoolSize: 10,
    };

    let peerConnection = null;
    let localStream = null;
    let remoteStream = null;
    let roomId = null;
    let chatChannel = null;

    function showChatMessage(msg){
        var p = document.createElement("P");
        p.innerHTML = "<b>" + msg + "</b>";
        document.getElementById("msg-list").appendChild(p);
    }

    document.getElementById("send-msg").onclick = function(){
        var msg = document.getElementById("msg").value;
        msg = msg.trim();
        document.getElementById("msg").value = "";
        if (msg === "" || chatChannel === null){
            return;
        }
        chatChannel.send(msg);
        var p = document.createElement("P");
        p.innerHTML = msg;
        document.getElementById("msg-list").appendChild(p);
    };

    async function createRoom() {
        const db = firebase.firestore();
        const roomRef = await db.collection('rooms').doc();
        peerConnection = new RTCPeerConnection(configuration);
        peerConnection.onconnectionstatechange= function(evento){
            if (peerConnection.connectionState == "connected"){
                // Create Chat channel below
                chatChannel = peerConnection.createDataChannel("chat");
                chatChannel.onopen = function(event) {
                    chatChannel.send('Hi you!');
                };
                chatChannel.onmessage = function(event) {
                    showChatMessage(event.data);
                };
                // Create Chat channel above
            }
        };

        localStream.getTracks().forEach(track => {
            peerConnection.addTrack(track, localStream);
        });
        const callerCandidatesCollection = roomRef.collection('callerCandidates');
        
        // Code for collecting ICE candidates below
        peerConnection.addEventListener('icecandidate', event => {
            if (!event.candidate) {
                return;
            }
            callerCandidatesCollection.add(event.candidate.toJSON());
        });
        // Code for collecting ICE candidates above
        
        // Code for creating a room below
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        const roomWithOffer = {
            'offer': {
                type: offer.type,
                sdp: offer.sdp,
            },
        };
        await roomRef.set(roomWithOffer);
        roomId = roomRef.id;
        document.getElementById("room-id-out").innerHTML = roomId;
        // Code for creating a room above
        
        // Code ?????????????? below
        peerConnection.addEventListener('track', event => {
            event.streams[0].getTracks().forEach(track => {
                remoteStream.addTrack(track);
            });
        });
        // Code ?????????????? above
    
        // Listening for remote session description below
        roomRef.onSnapshot(async snapshot => {
            const data = snapshot.data();
            if (!peerConnection.currentRemoteDescription && data && data.answer) {
                const rtcSessionDescription = new RTCSessionDescription(data.answer);
                await peerConnection.setRemoteDescription(rtcSessionDescription);
            }
        });
        // Listening for remote session description above
    
        // Listen for remote ICE candidates below
        roomRef.collection('calleeCandidates').onSnapshot(snapshot => {
            snapshot.docChanges().forEach(async change => {
                if (change.type === 'added') {
                    let data = change.doc.data();
                    await peerConnection.addIceCandidate(new RTCIceCandidate(data));
                }
            });
        });
        // Listen for remote ICE candidates above
        
        // Create Chat channel below
        chatChannel = peerConnection.createDataChannel("chat");
        chatChannel.onopen = function(event) {
            chatChannel.send('Hi you!');
        };
        chatChannel.onmessage = function(event) {
            showChatMessage(event.data);
        };
        // Create Chat channel above
    }

    async function joinRoomById() {
        var roomId = document.getElementById("room-id-in").value;
        
        const db = firebase.firestore();
        const roomRef = db.collection('rooms').doc(`${roomId}`);
        const roomSnapshot = await roomRef.get();
        
        if (roomSnapshot.exists) {
            peerConnection = new RTCPeerConnection(configuration);
            
            peerConnection.onconnectionstatechange= function(evento){
                if (peerConnection.connectionState == "connected"){
                    // Create Chat channel below
                    peerConnection.ondatachannel = function(event) {
                        chatChannel = event.channel;
                        chatChannel.onopen = function(event) {
                            chatChannel.send('Hi back!');
                        }
                        chatChannel.onmessage = function(event) {
                            showChatMessage(event.data);
                        }
                    }
                    // Create Chat channel above
                }
            };
    
            
            localStream.getTracks().forEach(track => {
                peerConnection.addTrack(track, localStream);
            });
    
            // Code for collecting ICE candidates below
            const calleeCandidatesCollection = roomRef.collection('calleeCandidates');
            peerConnection.addEventListener('icecandidate', event => {
                if (!event.candidate) {
                    return;
                }
                calleeCandidatesCollection.add(event.candidate.toJSON());
            });
            // Code for collecting ICE candidates above
            
            // Code ?????????????? below
            peerConnection.addEventListener('track', event => {
                event.streams[0].getTracks().forEach(track => {
                    remoteStream.addTrack(track);
                });
            });
            // Code ?????????????? above
            
            // Code for creating SDP answer below
            const offer = roomSnapshot.data().offer;
            await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
            const answer = await peerConnection.createAnswer();
            await peerConnection.setLocalDescription(answer);
            const roomWithAnswer = {
                answer: {
                    type: answer.type,
                    sdp: answer.sdp,
                },
            };
            await roomRef.update(roomWithAnswer);
            // Code for creating SDP answer above
    
            // Listening for remote ICE candidates below
            roomRef.collection('callerCandidates').onSnapshot(snapshot => {
                snapshot.docChanges().forEach(async change => {
                    if (change.type === 'added') {
                        let data = change.doc.data();
                        await peerConnection.addIceCandidate(new RTCIceCandidate(data));
                    }
                });
            });
            // Listening for remote ICE candidates above
        }
    }

    async function openUserMedia() {
        const stream = await navigator.mediaDevices.getUserMedia({video: true, audio: true});
        document.getElementById('localVideo').srcObject = stream;
        localStream = stream;
        remoteStream = new MediaStream();
        document.getElementById('remoteVideo').srcObject = remoteStream;
    }

    async function hangUp() {
        const tracks = document.querySelector('#localVideo').srcObject.getTracks();
        tracks.forEach(track => {
            track.stop();
        });
        
        if (remoteStream) {
            remoteStream.getTracks().forEach(track => track.stop());
        }
        
        if (peerConnection) {
            peerConnection.close();
        }
        
        // Delete room on hangup
        if (roomId) {
            const db = firebase.firestore();
            const roomRef = db.collection('rooms').doc(roomId);
            const calleeCandidates = await roomRef.collection('calleeCandidates').get();
            calleeCandidates.forEach(async candidate => {
                await candidate.ref.delete();
            });
            const callerCandidates = await roomRef.collection('callerCandidates').get();
            callerCandidates.forEach(async candidate => {
                await candidate.ref.delete();
            });
            await roomRef.delete();
        }
        document.location.reload(true);
    }

    function registerPeerConnectionListeners() {
        peerConnection.addEventListener('icegatheringstatechange', () => {
            console.log(`ICE gathering state changed: ${peerConnection.iceGatheringState}`);
        });
        
        peerConnection.addEventListener('connectionstatechange', () => {
            console.log(`Connection state change: ${peerConnection.connectionState}`);
        });
    
        peerConnection.addEventListener('signalingstatechange', () => {
            console.log(`Signaling state change: ${peerConnection.signalingState}`);
        });
        
        peerConnection.addEventListener('iceconnectionstatechange ', () => {
            console.log(`ICE connection state change: ${peerConnection.iceConnectionState}`);
        });
    }
    
    document.getElementById("create-room").onclick = createRoom;
    document.getElementById("open-camera").onclick = openUserMedia;
    document.getElementById("join-room").onclick = joinRoomById;
    document.getElementById("close-room").onclick = hangUp;
};
