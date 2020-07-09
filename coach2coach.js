rutas = {};

rutas.menu = function(){
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
