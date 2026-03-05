# 1. TEMEL İMAJ (Base Image)
# Boş bir odaya Node.js kurulmuş gibi düşün. 'alpine' sürümü çok küçüktür (güvenlik ve hız için iyidir).
FROM node:20-alpine

# 2. ÇALIŞMA DİZİNİ (Working Directory)
# Konteynerin içinde projeyi hangi klasöre koyalım? Standart olarak '/app' kullanılır.
WORKDIR /app

# 3. BAĞIMLILIKLARIN KOPYALANMASI (Cashing Optimization)
# Sadece package dosyalarını kopyalıyoruz. Kodun her değiştiğinde npm install 
# baştan çalışmasın diye bu adım kritiktir.
COPY package*.json ./

# 4. KURULUM (Installation)
# Bağımlılıkları konteyner içine yüklüyoruz.
RUN npm install

# 5. KODLARIN KOPYALANMASI
# Şimdi kendi yazdığın tüm dosyaları (src, routes, config vb.) konteyner içine atıyoruz.
COPY . .

# 6. PORT TANIMLAMA
# Uygulamanın 3000 portunda çalışacağını dökümante ediyoruz.
EXPOSE 3000

# 7. ÇALIŞTIRMA (Command)
# Konteyner 'run' dendiğinde çalışacak asıl komut.
CMD ["npm", "start"]