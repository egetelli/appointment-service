const Transport = require('winston-transport');
const amqp = require('amqplib');
const { info } = require('winston');

class RabbitMQTransport extends Transport {
    constructor(opts){
        super(opts);
        this.rabbitUrl = opts.url || 'amqp://localhost';
        this.queueName = opts.queue || 'system_logs';

        this.channel = null;
        this.connection = null;

        // 1.Bekleme Odamız: Bağlantı kurulana kadar loglar burada bekler
        this.logQueue = [];

        // 2.Kamyon Durumu: Kamyon (RabbitMQ) şu an depoda mı ?
        this.isReady = false;

        //Constructor senkron olduğu için, bağlama işlemini asenkron olarak
        //başlatıp arka plana atıyoruz. JavaScript motoru beklemez, devam eder.
        this.connectToRabbitMQ();
    }

    //Asenkron bağlantı fonksiyonumuz
    async connectToRabbitMQ(){
        try {
            this.connection = await amqp.connect(this.rabbitUrl);
            this.channel = await this.connection.createChannel();
            await this.channel.assertQueue(this.queueName, { durable: true });

            // Kamyon yanaştı ve yüklemeye hazır
            this.isReady = true;

            // 3. Kamyon Geldiğinde: Bekleme odasında (Kuyrukta) bekleyen paket var mı ?
            // Varsa hepsini tek tek kamyona yükle (Kuyruğu boşalt)
            this.flushQueue();
        } catch (error) {
            console.error("RabbitMQ Bağlantı Hatası (Log Taşıyıcısı: ", error);
        }
    }

    // Bekleme odasını (Kuyruğu) kamyona boşaltan fonksiyon.
    flushQueue(){
        while (this.logQueue.length > 0){
            // Kuyruğun başındaki ilk öğeyi al (shift)
            const pendingLog = this.logQueue.shift();
            //Kamyona yükle
            this.sendLogToRabbitMQ(pendingLog);
        }
    }

    //Asıl log gönderme işlemi (Buffer'a çevirip gönderir)
    sendLogToRabbitMQ(info){
        const logBuffer = Buffer.from(JSON.stringify(info));
        this.channel.sendToQueue(this.queueName, logBuffer);
    }

    // Winston'un çağıracağı fonksiyon
log(info, callback) {
    setImmediate(() => {
      this.emit('logged', info);
    });

    // 4. KARAR ANI: Winston bir log gönderdiğinde ne yapacağız?
    if (this.isReady) {
      // Kamyon buradaysa direkt yükle
      this.sendLogToRabbitMQ(info);
    } else {
      // Kamyon yoldaysa (Bağlantı kuruluyorsa), paketi bekleme odasına koy
      this.logQueue.push(info);
    }

    callback(); // Winston'a "Ben işimi bitirdim" de
  }
}

module.exports = RabbitMQTransport;