"use strict";

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
          <ul class="collection" id="amigos"></ul>
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
                parametros.misdatos.amigos.splice(1,0);
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
    document.getElementById("amigos").onclick = function(evento){
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
        document.getElementById("amistades").innerHTML = "";
        var lng = parametros.misdatos.amigos.length;
        for(let i=0;i<lng;i++){
            datosAmigo(parametros.misdatos.amigos[i],imprimirAmigo);
        }
    }
    function imprimirAmigo(datos){
        var li = document.createElement("LI");
        li.classList.add("collection-item","avatar");
        var strHtml;
        {strHtml = `
<img src="${datos.photoURL}" alt="" class="circle">
<span class="title">${datos.displayName}</span>
<p>${datos.correo}<p>
<a id="borrar-${datos.correo}" class="secondary-content"><i class="material-icons">trash</i></a>
        `;}
        li.innerHTML = strHtml;
        document.getElementById("amigos").appendChild(li);
    }
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
