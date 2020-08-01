"use strict";

var rutas = {};
var misdatos;

//----------------------------------------------------------------------

rutas.inicio = function(){
    var strHtml;
    {strHtml = `
  <br>
  <div class="row">
    <div class="col s12 offset-l2 l8">
      <div class="carousel carousel-slider center" id="carousel">
        <div class="carousel-item ">
          <img src="/img/carousel1.jpg" class="responsive-img redondeado">
        </div>
        <div class="carousel-item">
          <img src="/img/carousel2.jpg" class="responsive-img redondeado">
        </div>
        <div class="carousel-item">
          <img src="/img/carousel3.jpg" class="responsive-img redondeado">
        </div>
        <div class="carousel-item">
          <img src="/img/carousel4.jpg" class="responsive-img redondeado">
        </div>
      </div>
    </div>
  </div>
  <div id="google" class="row white valign-wrapper center z-depth-2 google">
    <div class="col s2 valign-wrapper">
      <img src="/img/google.png" class="responsive-img">
    </div>
    <div class="col s10 black-text valign-wrapper">
      <h5>Ingrese con google</h5>
    </div>
  </div>
    `;}
    document.getElementById("contenedor").innerHTML = strHtml;
    M.Carousel.init(document.querySelectorAll('.carousel'),{
        fullWidth: true,
        indicators: true,
    });
    var elCarousel = M.Carousel.getInstance(document.getElementById("carousel"));
    setTimeout(cambiarCarousel,5000);
    function cambiarCarousel(){
        if (document.getElementById("carousel")){
            elCarousel.next();
            setTimeout(cambiarCarousel,5000);
        }
    }
    document.getElementById('google').onclick = function(){
        localStorage.clear();
        var provider = new firebase.auth.GoogleAuthProvider();
        firebase.auth().signInWithRedirect(provider);
    };
};

//----------------------------------------------------------------------

rutas.menu = function(){
    var strHtml;
    {strHtml = `
<br>
<div class="row">
  <div class="col s6 m4 l3">
    <div class="card z-depth-3" onclick="window.location.href='/coach2coach.html'">
      <div class="card-image">
        <img class="responsive-img" src="/img/coach2coach.jpg">
        <span class="card-title truncate">Coaching</span>
      </div>
    </div>
  </div>
  <div class="col s6 m4 l3">
    <div class="card z-depth-3" onclick="window.location.href='/accountpartner.html'">
      <div class="card-image">
        <img class="responsive-img" src="/img/accountpartner.jpg">
        <span class="card-title truncate">Accountability</span>
      </div>
    </div>
  </div>
</div>
<div class="row redondeado orange valign-wrapper white-text" onclick="window.location.href='#amigos'">
  <div class="col s3">
    <span class="material-icons">groups</span>
  </div>
  <div class="col s9">
    <h5>Mis Amistades</h5>
  </div>
</div>
    `;}
    document.getElementById("contenedor").innerHTML = strHtml;
    document.getElementById("menutitulo").href = "#menu";
};

//----------------------------------------------------------------------

rutas.amigos = function(){
    var strHtml;
    {strHtml = `
<div class="row">
  <div class="col s12">
    <h4>Mis Amistades</h4>
  </div>
</div>
<div class="row">
  <div class="col s12">
    <ul class="collapsible">
      <li>
        <div class="collapsible-header orange white-text">
          <i class="material-icons">how_to_reg</i>
          <b>Solicitudes</b>
        </div>
        <div class="collapsible-body" id="solicitudes">
        </div>
      </li>
      <li>
        <div class="collapsible-header orange white-text">
          <i class="material-icons">groups</i>
          <b>Mis amistades</b>
        </div>
        <div class="collapsible-body" id="amistades">
        </div>
      </li>
      <li>
        <div class="collapsible-header orange white-text">
          <i class="material-icons">person_add</i>
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
    <h4>Eliminar Amistad</h4>
    <p>¿Está seguro de querer eliminar a esta persona?</p>
  </div>
  <div class="modal-footer">
    <a class="modal-close waves-effect waves-green btn-flat">Cancelar</a>
    <a id="borrar" class="modal-close waves-effect waves-green btn-flat orange">BORRAR</a>
  </div>
</div>
<div id="modal2" class="modal">
  <div class="modal-content">
    <h4>Aceptar Amistad</h4>
    <p>¿Está seguro de querer aceptar a esta persona?</p>
  </div>
  <div class="modal-footer">
    <a id="aceptar" class="modal-close waves-effect waves-green btn-flat">Aceptar</a>
    <a id="rechazar" class="modal-close waves-effect waves-green btn-flat orange">BORRAR</a>
  </div>
</div>
    `;}
    document.getElementById("contenedor").innerHTML = strHtml;
    M.updateTextFields();
    M.Collapsible.init(document.querySelectorAll('.collapsible'));
    M.Modal.init(document.querySelectorAll('.modal'));

    var db = firebase.firestore();
    
    //solicitudes
    var correoSolicitud = "";
    document.getElementById("aceptar").onclick = function(){
        var elCorreo = correoSolicitud.slice();
        correoSolicitud = "";
        
        db.collection("misdatos").doc(misdatos.uid).update({
            amigos: firebase.firestore.FieldValue.arrayUnion(elCorreo),
        }).then(res => {
            misdatos.amigos.push(elCorreo);
            localStorage.setItem('misdatos',JSON.stringify(misdatos));
            return db.collection("invitacion").doc(misdatos.email).collection('invitador').doc(elCorreo).delete();
        }).then(() => {
            getSolicitudes();
        }).catch(function(error) {
            console.error("Error removing document: ", error);
        });

        db.collection("aceptacion").doc(elCorreo).collection('aceptador').doc(misdatos.email).set({
            fecha: Date.now(),
        });
    };
    document.getElementById("rechazar").onclick = function(){
        db.collection("invitacion").doc(misdatos.email).collection('invitador').doc(correoSolicitud).delete().then(() => {
            getSolicitudes();
        }).catch(function(error) {
            console.error("Error removing document: ", error);
        });
    };
    document.getElementById("solicitudes").onclick = function(evento){
        var destino = evento.target;
        var id = destino.id;
        while(id === ""){
            destino = destino.parentElement;
            id = destino.id;
        }
        if (id.includes("solicitud-")){
            correoSolicitud = id.replace("solicitud-","");
            M.Modal.getInstance("modal2").open();
        }
    };
    function getSolicitudes(){
        function printSolicitud(correo,dato){
            if (misdatos.amigos.indexOf(correo) >= 0){
                db.collection("invitacion").doc(misdatos.email).collection('invitador').doc(correo).delete().then(() => {
                    console.log("Document successfully deleted!");
                }).catch(function(error) {
                    console.error("Error removing document: ", error);
                });
                return;
            }
            datosAmigo.then(datos => {
                var div = document.createElement("DIV");
                div.style.overflowX="auto";
                div.style.whiteSpace= "nowrap";
                div.classList.add("row","orange","lighten-4","redondeado");
                div.id = "solicitud-" + datos.correo;
                var strHtml;
                {strHtml = `
<br>
<div class="col s3">
  <img src="${datos.photoURL}" alt="" class="circle responsive-img">
</div>
<div class="col s9">
  ${datos.displayName}<br>
  ${datos.correo}<br><br>
</div>
                `;}
                div.innerHTML = strHtml;
                document.getElementById("solicitudes").appendChild(div);
            }).catch(err => {
                console.log(err);
            });
        }
        document.getElementById("solicitudes").innerHTML = "";
        db.collection("invitacion").doc(misdatos.email).collection('invitador').get().then(querySnapshot => {
            querySnapshot.forEach(doc => {
                printSolicitud(doc.id,doc.data());
            });
        }).catch(function(error) {
            console.log("Error getting documents: ", error);
        });
    }
    getSolicitudes();
    
    //amistades
    var correoBorrar = "";
    document.getElementById("borrar").onclick = function(){
        if(correoBorrar === ""){
            return;
        }
        var elCorreo = correoBorrar.slice();
        correoBorrar = "";
        if (misdatos.amigos.indexOf(elCorreo)>=0){
            db.collection("misdatos").doc(parametros.uid).update({
                amigos: firebase.firestore.FieldValue.arrayRemove(elCorreo),
            }).then(res => {
                var pos = misdatos.amigos.indexOf(elCorreo);
                misdatos.amigos.splice(pos,1);
                localStorage.setItem('misdatos',JSON.stringify(misdatos));
                getAmistades();
            }).catch(err => {
                console.log(err);
            });
            
            db.collection("anulacion").doc(elCorreo).collection('anulador').doc(misdatos.email).set({
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
            correoBorrar = id.replace("borrar-","");
            M.Modal.getInstance("modal1").open();
        }
    };
    function getAmistades(){
        var guardar = false;
        document.getElementById("amistades").innerHTML = "";
        var lng = misdatos.amigos.length;
        for(let i=0;i<lng;i++){
            datosAmigo(misdatos.amigos[i]).then(datos => {
                imprimirAmigo(datos);
            }).catch(err => {
                console.log(err);
            });
            var pos = misdatos.invite.indexOf(misdatos.amigos[i]);
            if (pos>=0){
                misdatos.invite.splice(pos,1);
                guardar = true;
            }
        }
        if(guardar){
            db.collection("misdatos").doc(misdatos.uid).update({
                invite: misdatos.invite,
            }).then(res => {
                localStorage.setItem('misdatos',JSON.stringify(misdatos));
            }).catch(err => {
                console.log(err);
            });
        }
    }
    function imprimirAmigo(datos){
        var div = document.createElement("DIV");
        div.style.overflowX="auto";
        div.style.whiteSpace= "nowrap";
        div.classList.add("row","orange","lighten-4","redondeado");
        div.id = "borrar-" + datos.correo;
        var strHtml;
        {strHtml = `
<br>
<div class="col s3">
  <img src="${datos.photoURL}" alt="" class="circle responsive-img">
</div>
<div class="col s9">
  ${datos.displayName}<br>
  ${datos.correo}<br><br>
</div>
        `;}
        div.innerHTML = strHtml;
        document.getElementById("amistades").appendChild(div);
    }
    getAmistades();
    
    //nueva amistad
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
        
        if (misdatos.invite.indexOf(correo)>=0){
            return;
        }
        
        document.getElementById("correo").value = "";
        db.collection("correo").doc(correo).get().then(doc => {
            if (doc.exists) {
                return db.collection("invitacion").doc(correo).collection('invitador').doc(misdatos.email).set({
                    fecha: Date.now(),
                });
            } else {
                throw "Esta persona no es miembro de Didaske. ¡Invitala!";
            }
        }).then(res => {
            return db.collection("misdatos").doc(misdatos.uid).update({
                invite: firebase.firestore.FieldValue.arrayUnion(correo),
            });
        }).then(res => {
            misdatos.invite.push(correo);
            localStorage.setItem('misdatos',JSON.stringify(misdatos));
            M.toast({html: "Solicitud enviada"});
        }).catch(function(error){
            M.toast({html: error});
        });
    };
    
    //undergrownd
    function getAceptaciones(){
        function agregarAmigo(correo,dato){
            if (misdatos.amigos.indexOf(correo)<0){
                db.collection("misdatos").doc(misdatos.uid).update({
                    amigos: firebase.firestore.FieldValue.arrayUnion(correo),
                }).then(res => {
                    misdatos.amigos.push(correo);
                    var pos = misdatos.invite.indexOf(correo);
                    if (pos>=0){
                        misdatos.invite.splice(pos,1);
                    }
                    localStorage.setItem('misdatos',JSON.stringify(misdatos));
                }).catch(err => {
                    console.log(err);
                });
            }
            db.collection("invitacion").doc(misdatos.email).collection('invitador').doc(correo).delete().then(() => {
            }).catch(function(error) {
                console.error("Error removing document: ", error);
            });
        }
        var handler = null;
        db.collection("aceptacion").doc(misdatos.email).collection('aceptador').get().then(querySnapshot => {
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
    getAceptaciones();
    
    function getAnulaciones(){
        function anularAmigo(correo,dato){
            if (misdatos.amigos.indexOf(correo) >= 0){
                db.collection("misdatos").doc(misdatos.uid).update({
                    amigos: firebase.firestore.FieldValue.arrayRemove(correo),
                }).then(res => {
                    var pos = misdatos.amigos.indexOf(correo);
                    if (pos>=0){
                        misdatos.amigos.splice(1,0);
                    }
                    localStorage.setItem('misdatos',JSON.stringify(misdatos));
                }).catch(err => {
                    console.log(err);
                });
            }
            db.collection("anulacion").doc(misdatos.email).collection('anulador').doc(correo).delete().then(() => {
            }).catch(function(error) {
                console.error("Error removing document: ", error);
            });
        }
        var handler = null;
        db.collection("anulacion").doc(misdatos.email).collection('anulador').get().then(querySnapshot => {
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
};


//######################################################################

window.onload = function(){
    window.onhashchange = reload;
    rutas.inicio();
    authinit();
};

function reload(){
    var url = decodeURI(window.location.hash);
    var vecUrl = url.split('/');
    if (vecUrl.length===0 || (vecUrl.length===1 && vecUrl[0]==="")){
        window.location.href="#inicio";
    } else {
        rutas[vecUrl[0].replace("#","")](vecUrl);
    }
}

function authinit(){
    firebase.auth().onAuthStateChanged(usuario => {
        if(usuario) {
            getMisDatos(usuario);
            window.location.href="#menu";
        }
    });
    firebase.auth().getRedirectResult().then(result => {
        if (result && result.user){
            getMisDatos(result.user);
            window.location.href="#menu";
        }
    }).catch(err => {
        console.log(err);
    });
}

function datosAmigo(correo){
    return new Promise((resolve, reject) => {
        var datoStr = localStorage.getItem('datosAmigo-'+correo);
        if (datoStr !== null){
            var ahora = Date.now();
            var dato = JSON.parse(datoStr);
            if (dato.timeout >= ahora){
                resolve(dato);
                return;
            }
            localStorage.removeItem('datosAmigo-'+correo);
        }
        var db = firebase.firestore();
        db.collection("correo").doc(correo).get().then(function(doc) {
            var datos = doc.data();
            datos.correo = correo;
            datos.timeout = Date.now() + 7*24*60*60*1000;
            localStorage.setItem('datosAmigo-'+correo,JSON.stringify(datos));
            resolve(datos);
        }).catch(function(error) {
            reject(error);
        });
    });
}

function getMisDatos(usuario){
    var datstr = localStorage.getItem('misdatos');
    if (datstr){
        misdatos = JSON.parse(datstr);
        var ahora = Date.now();
        if (misdatos.timeout >= ahora){
            return;
        }
    }
    datstr = null;
    ahora = null;
    var db = firebase.firestore();
    db.collection("misdatos").doc(usuario.uid).get().then(doc => {
        if (doc.exists) {
            misdatos = doc.data();
            misdatos.uid = usuario.uid;
            misdatos.email = usuario.email;
            misdatos.timeout = Date.now()+24*60*60*1000;
            localStorage.setItem('misdatos',JSON.stringify(misdatos));
        } else {
            misdatos = {
                token: "",
                invite: [],
                amigos: [],
            };
            db.collection("misdatos").doc(usuario.uid).set(misdatos).then(res => {
                misdatos.uid = usuario.uid;
                misdatos.email = usuario.email;
                misdatos.timeout = Date.now()+24*60*60*1000;
                localStorage.setItem('misdatos',JSON.stringify(misdatos));
            }).catch(err => {
                console.log(err);
            });
        }
    }).catch(err => {
        console.log(err);
    });
}
