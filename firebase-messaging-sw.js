importScripts('/__/firebase/7.14.4/firebase-app.js');
importScripts('/__/firebase/7.14.4/firebase-messaging.js');
importScripts('/__/firebase/init.js');

const messaging = firebase.messaging();

messaging.setBackgroundMessageHandler(function(payload) {
    const notificationTitle = 'Didaske';
    const notificationOptions = {
        body: 'Tienes un mensaje',
    };
    return self.registration.showNotification(notificationTitle,notificationOptions);
});
