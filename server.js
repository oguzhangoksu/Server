var admin = require("firebase-admin");
var serviceAccount = require("./serviceAccountKeys.json");
const multer = require('multer');
var cors = require('cors');
const v4 = require('uuid');
const bodyParser = require('body-parser');
const firestoreAutoId =require("@google-cloud/firestore/build/src/util");
const { spawn } = require('child_process');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// firebase admin initialize
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket:"gs://deneme-300d0.appspot.com",
    authDomain: "deneme-300d0.firebaseapp.com",
  });

const express = require('express');
const { Timestamp } = require("@google-cloud/firestore");
const app = express()
app.use(cors());

//Server listen live on port 3000



const storage = multer.memoryStorage();
const upload = multer({ storage:storage });

//firestore arrangment
const db = admin.firestore();
db.settings({ ignoreUndefinedProperties: true });
const adColectionRef = db.collection('AdList');
const usersCollectionRef = db.collection('Users');
const adminCollectionRef = db.collection('Admin');
const adoptionListCollectionRef = db.collection('AdoptionList');
const lostListCollectionRef = db.collection('LostList');
const petCollectionRef = db.collection('PetList');
const userColectionRef = db.collection('Users');
const cityCollectionRef = db.collection('City');
const secretKey ='abcdefghtklmn';









// upload image to firebase storage and return image url
app.post('/upload', upload.single('image'), async function (req, res) {
    try{
        console.log(req.headers.userid)
        const bucket = admin.storage().bucket(`deneme-300d0.appspot.com`);
        if(!req.file){
        return res.status(400).send('No files were uploaded.');
        }
    
        const metadata = {
        metadata: {
            firebaseStorageDownloadTokens: v4.v4()
        },
        contentType: req.file.mimetype,
        cacheControl: 'public, max-age=31536000',
        };
    
        const blob = bucket.file(`${req.headers.userid}/${req.file.originalname+Date.now()}`);
        const blobStream = blob.createWriteStream({
        metadata: metadata,
        gzip: true //enable compression if you needed
    
        });
    
        blobStream.on('error', (err) => {
        return res.status(500).json({ error: "Unable to upload image" });
        })
    
        blobStream.on('finish', () => {
        console.log("bucket.name:",bucket.name)
        console.log("blob.name:",blob.name)
        console.log("metadata.metadata.firebaseStorageDownloadTokens:",metadata.metadata.firebaseStorageDownloadTokens)
        const imageUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURI(blob.name).replaceAll("/","%2F")}?alt=media&token=${metadata.metadata.firebaseStorageDownloadTokens}`;
        return res.status(201).json({ imageUrl: imageUrl });
        })
    
        blobStream.end(req.file.buffer);
    }catch(err){
        console.log(err)
        res.status(500).json({"error":`${err}`})
    }


  })


app.use(bodyParser.json())



// Adoption API's 

app.post("/saveAdoption",authenticateToken,(req,res)=>{
    /*Input Example
        {
            userid:"123456789",
            address:"...Kepez/Antalya",
            city:"Antalya",
            neighborhood:"Kepez",
            age:"3",
            breed:"Golden",
            description:"Sage ran away from home during the New Year’s Eve fireworks. Usually, she would hide somewhere and come out a few hours later, but being 16 years old, she must have gotten confused! PawBoost was definitely the place to go to reunite with Sage. PawBoost helped me access the right places in my area to help find my dog! Before using PawBoost, I would have had to contact all the shelters constantly and hope they had my dog. PawBoost did all this in less than 48 hours!",
            name:"Zeytin",
            gender:"Male",
            type:"Dog",
            image:"this will be image url from firebase storage which will provided by '/upload' API",
            
          
        }
    */ 
    const adId = firestoreAutoId.autoId();
    const adoptionAdId = firestoreAutoId.autoId();
    const petId = firestoreAutoId.autoId();
    let status = req.body.status !== undefined ? req.body.status : 0;
    console.log("status👋👋👋👋",status)
    console.log(req.body)
    //Ad Save
    adColectionRef.doc(adId).set({
        user_id:req.body.userid,
        ad_type:"Adoption",
    }).then(()=>{
        console.log("Ad Saved")
        
        //Adoption Save
        adoptionListCollectionRef.doc(adoptionAdId).set({
            ad_id:adId,
            status:status
        }).then(()=>{
            console.log("adoption Saved")
            
            //Pet Save
            petCollectionRef.doc(petId).set({
                ad_id:adId,
                address:req.body.address,
                city:req.body.city,
                neighborhood:req.body.neighborhood,
                age:req.body.age,
                breed:req.body.breed,
                description:req.body.description,
                name:req.body.name,
                gender:req.body.gender,
                type:req.body.type,
                image:req.body.image,
                date:admin.firestore.Timestamp.now()
                
            }).then(async ()=>{
                console.log("Pet Saved")
                
                
                res.status(200).send({
                    status:"Adoption Saved"
                    
                })
            }).catch((err)=>{
                res.status(400).send("Adoption Could Not Saved")
            })
        }).catch((err)=>{
            console.log("Pet Could Not Saved")
            console.log(err)
            res.status(400).send("Pet Could Not Saved")
        })


    }).catch((err)=>{
        console.log(" Ad Could Not Saved")
        res.status(400).send(" Ad Could Not Saved")
    })
})




app.get("/getAdoptionList",async (req,res)=>{
    const adoptionList = [];

    try{
        const adoptionListSnapshot = await adoptionListCollectionRef.get();

        const proimises = adoptionListSnapshot.docs.map(async (doc)=>{
            const adDoc = await adColectionRef.doc(doc.data().ad_id).get();

            if(adDoc.exists){
                const user = await userColectionRef.doc(adDoc.data().user_id).get();
                const petListSnapshot = await petCollectionRef.where("ad_id","==",doc.data().ad_id).get();
                petListSnapshot.forEach((petDoc)=>{
                    adoptionList.push({
                        "adoption_id":doc.id,
                        "ad_id":doc.data().ad_id,
                        "status":doc.data().status,
                        "address":petDoc.data().address,
                        "city":petDoc.data().city,
                        "neighborhood":petDoc.data().neighborhood,
                        "age":petDoc.data().age,
                        "breed":petDoc.data().breed,
                        "description":petDoc.data().description,
                        "gender":petDoc.data().gender,
                        "image":petDoc.data().image,
                        "type":petDoc.data().type,
                        "name":petDoc.data().name,
                        "date":petDoc.data().date,
                        "senderName":user.data().name,
                        "senderID":user.id,
                        "sender-email:":user.data().email,
                        "sender-phone":user.data().phone,
                    })
                })
            }
            else{
                console.log("adDoc not found") 
            }
        })
        const results = await Promise.all(proimises)
        results.flat().filter(Boolean).forEach(pet => adoptionList.push(pet));
        res.status(200).send(adoptionList)
        //res.status(200).json({adoptionList:adoptionList})
    }
    
    catch(err){
        console.log(err)
        res.status(500).json({"error":`${err}`})
    
    }
    /*Output Example NOTE: Inside the array there will be multiple objects 
    adoptionList:{
        [
            {
                "adoption_id": "mK2rUVva6M9DS1Orpfle",
                "ad_id": "AdTwo",
                "status": false,
                "address": "....İstanbul",
                "city":"İstanbul"
                "neighborhood":"ÇekmeKöy",
                "age": "3",
                "breed": "Samoyed",
                "description": "TEST 00:49 03/01/2024",
                "gender":"male",
                "image":"image url",
                "type":"Dog",
                "name": "Sirke",
                "date":petDoc.data().date,
                "senderName": "Oğuzhan",
                "senderID": "UserOne"
            }
        ]
    }
    */

})


app.post("/postAdoptionListByAdId",async (req,res)=>{
    const adoptionList = [];
    try{
        const ad = await adColectionRef.doc(req.body.adid).get();
        const user = await usersCollectionRef.doc(ad.data().user_id).get();
        const adoptionListSnapshot = await adoptionListCollectionRef.where("ad_id","==",req.body.adid).get();
        const adoptionListPromises = adoptionListSnapshot.docs.map(async (doc)=>{
            const petListsSnapshot = await petCollectionRef.where("ad_id","==",doc.data().ad_id).get();
            const pets= petListsSnapshot.docs.map((petDoc)=>({
                "adoption_id": doc.id,
                "ad_id": doc.data().ad_id,
                "status": doc.data().status,
                "address": petDoc.data().address, 
                "city":petDoc.data().city,
                "neighborhood":petDoc.data().neighborhood,
                "age": petDoc.data().age,
                "breed": petDoc.data().breed,
                "description": petDoc.data().description,
                "gender":petDoc.data().gender,
                "image": petDoc.data().image,
                "type":petDoc.data().type,
                "name": petDoc.data().name,
                "date":petDoc.data().date,
                "senderName":user.data().name,
                "senderID":user.id,
                
            }));
            adoptionList.push(...pets);
        })
        await Promise.all(adoptionListPromises);
        console.log(adoptionList);
        res.status(200).send(adoptionList)
    }
    catch(err){
        console.log(err)
        res.status(500).json({"error":`${err}`})

    }
    /*Output Example- NOTE: Inside the array there will be multiple objects for each pet
    [
        {
            adoption_id: 'AdoptionOne',
            ad_id: 'AdOne',
            status: false,
            address: '..Antalya',
            city:"Antalya",
            "neighborhood":"Kepez",
            age: '5',
            breed: '"Şivava"',
            description: 'Sage ran away from home during the New Year’s Eve fireworks. Usually, she would hide somewhere and come out a few hours later, but being 16 years old, she must have gotten confused! PawBoost was definitely the place to go to reunite with Sage. PawBoost helped me access the right places in my area to help find my dog! Before using PawBoost, I would have had to contact all the shelters constantly and hope they had my dog. PawBoost did all this in less than 48 hours!',
            gender:"male",
            image: '',
            type:"Dog"
            name: 'Zeytin',
            "date":petDoc.data().date,
            "senderName": "Oğuzhan",
            "senderID": "UserOne"
        }
    ]
    */
})


app.post("/postAdoptionListByUserId",authenticateToken, async (req, res) => {
    const adoptionList = [];
    try {
        const adListSnapshot = await adColectionRef
            .where("user_id", "==", req.body.userid)
            .where("ad_type", "==", "Adoption")
            .get();
        const user = await userColectionRef.doc(req.body.userid).get();
        const promisesAll = adListSnapshot.docs.map(async (doc) => {
            const adoptionListSnapshot = await adoptionListCollectionRef.where("ad_id", "==", doc.id).get();
            
            const petsPromises = adoptionListSnapshot.docs.map(async (adoptionDoc) => {
                const petListSnapshot = await petCollectionRef.where("ad_id", "==", adoptionDoc.data().ad_id).get();
                
                return petListSnapshot.docs.map(petDoc => ({
                    "adoption_id": adoptionDoc.id,
                    "ad_id": adoptionDoc.data().ad_id,
                    "status": adoptionDoc.data().status,
                    "address": petDoc.data().address, 
                    "city":petDoc.data().city,
                    "neighborhood":petDoc.data().neighborhood,
                    "age": petDoc.data().age,
                    "breed": petDoc.data().breed,
                    "description": petDoc.data().description,
                    "gender": petDoc.data().gender,
                    "image": petDoc.data().image, 
                    "type":petDoc.data().type,
                    "name": petDoc.data().name,
                    "date":petDoc.data().date,
                    "senderName":user.data().name,
                    "senderID":user.id
                }));
            });

            const petsResults = await Promise.all(petsPromises);
            return petsResults.flat();
        });

        const results = await Promise.all(promisesAll);
        results.flat().filter(Boolean).forEach(petData => adoptionList.push(petData));
        console.log("adoptionList:", adoptionList);
        res.status(200).send(adoptionList);
    } catch (err) {
        console.log(err);
        res.status(500).json({ "error": `${err}` });
    }

    /* Output Example
        [
        {
            lost_id: 'mK2rUVva6M9DS1Orpfle',
            ad_id: 'AdTwo',
            status: false,
            address: "..... Antalya",
            "city":"Antalya",
            "neighborhood":"Kepez",
            age: '3',
            breed: 'Samoyed',
            description: 'TEST 00:49 03/01/2024',
            gender:"male",
            image: 'Test Link',
            type:"Dog",
            name: 'Zeytin',
            "date":petDoc.data().date,
            "senderName": "Oğuzhan",
            "senderID": "UserOne"
        }
    ]
    
    */
});


// Silinebilir

app.get("/getApprovedAdoptionList",async (req,res)=>{
    const adoptionList = [];
    try{    

        const adoptionListSnapshot = await adoptionListCollectionRef.where("status","==",2).get();
        const promises=adoptionListSnapshot.docs.map(async (doc)=>{
            const petListSnapshot = await petCollectionRef.where("ad_id","==",doc.data().ad_id).get();
            petListSnapshot.docs.map((petDoc)=>{
                adoptionList.push({
                    "adoption_id":doc.id,
                    "ad_id":doc.data().ad_id,
                    "address":petDoc.data().address,    
                    "city":petDoc.data().city,
                    "neighborhood":petDoc.data().neighborhood,                
                    "age":petDoc.data().age,
                    "breed":petDoc.data().breed,
                    "description":petDoc.data().description,
                    "gender":petDoc.data().gender,
                    "status":doc.data().status,
                    "image":petDoc.data().image,
                    "type":petDoc.data().type,
                    "name":petDoc.data().name,
                })

            })
        })
        await Promise.all(promises);
        console.log(adoptionList)
        res.status(200).send(adoptionList)
    }catch(err){
        console.log(err)
        res.status(500).json({"error":`${err}`})

    }
    
})


app.post("/deleteAdoption",authenticateToken,async (req,res)=>{
    try{
        const petlist = await petCollectionRef.where("ad_id","==",req.body.ad_id).get();
        await petCollectionRef.doc(petlist.docs[0].id).delete();
        await adoptionListCollectionRef.doc(req.body.adoption_id).delete();
        await adColectionRef.doc(req.body.ad_id).delete();
        console.log("Adoption Deleted...")
        res.status(200).json({"success":"Success"})  
        
       
    }
    catch(err){
        console.log(err)
        res.status(500).json({"error":`${err}`})
    }
    

})



app.post("/updateAdoption",authenticateToken,async (req,res)=>{
    try{
        let result = "Notification Not Sent .."
        const adoption=await adoptionListCollectionRef.doc(req.body.adoption_id).get();
        if(adoption.get("status")!=req.body.status){
            await adoptionListCollectionRef.doc(req.body.adoption_id).update({
                status:req.body.status
            })
            if (req.body.status==2){
                result=await NotificationSystemAdoptionPet(req.body.senderID,req.body.ad_id,req.body.image,req.body.city,req.body.neighborhood)
                console.log(result)
            }
        }
        


        const petlist = await petCollectionRef.where("ad_id","==",req.body.ad_id).get();
        await petCollectionRef.doc(petlist.docs[0].id).update({
            address:req.body.address,
            age:req.body.age,
            breed:req.body.breed,
            city:req.body.city,
            neighborhood:req.body.neighborhood,
            description:req.body.description,
            gender:req.body.gender,
            image:req.body.image,
            name:req.body.name,
            type:req.body.type

        })
        console.log("Adoption Updated...")
        
        res.status(200).json({"success":"Success","notification":result})  
        
       
    }
    catch(err){
        console.log(err)
        res.status(500).json({"error":`${err}`})
    }
    

})



// Lost API's

app.post("/saveLost",authenticateToken,(req,res)=>{
        /*Input Example
        {
            userid:"123456789",
            address:"...Kepez/Antalya",
            city:"Antalya",
            neighborhood:"Kepez",
            age:"3",
            breed:"Golden",
            description:"Sage ran away from home during the New Year’s Eve fireworks. Usually, she would hide somewhere and come out a few hours later, but being 16 years old, she must have gotten confused! PawBoost was definitely the place to go to reunite with Sage. PawBoost helped me access the right places in my area to help find my dog! Before using PawBoost, I would have had to contact all the shelters constantly and hope they had my dog. PawBoost did all this in less than 48 hours!",
            name:"Zeytin",
            gender:"male",
            type:"Dog",
            image:"this will be image url from firebase storage which will provided by '/upload' API"
            
        }
    */ 

    const adId = firestoreAutoId.autoId();
    const lostAdId = firestoreAutoId.autoId();
    const petId = firestoreAutoId.autoId();
    var status = req.body.status !== undefined ? req.body.status : 0;
   
    console.log(req.body)
    //Ad Save
    adColectionRef.doc(adId).set({
        user_id:req.body.userid,
        ad_type:"Lost",
    }).then(()=>{
        console.log("Ad Saved")
        //Lost Ad Save
        console.log("❤️❤️❤️❤️",status)
        lostListCollectionRef.doc(lostAdId).set({
            ad_id:adId,
            status:status
        }).then(()=>{
            console.log("Lost Saved")
            
            //Pet Save
            petCollectionRef.doc(petId).set({
                ad_id:adId,
                address:req.body.address,
                city:req.body.city,
                neighborhood:req.body.neighborhood,
                age:req.body.age,
                breed:req.body.breed,
                description:req.body.description,
                name:req.body.name,
                gender:req.body.gender,
                type:req.body.type,
                image:req.body.image,
                date:admin.firestore.Timestamp.now()
                
            }).then(()=>{
                console.log("Pet Saved")

                res.status(200).send({
                    status:"Lost Saved"

                })
            }).catch((err)=>{
                res.status(400).send("Lost Could Not Saved")
            })
        }).catch((err)=>{
            console.log("Pet Could Not Saved")
            res.status(400).send("Pet Could Not Saved")
        })
    
    }).catch((err)=>{
        console.log(" Ad Could Not Saved")
        res.status(400).send(" Ad Could Not Saved")
    })

})


app.get("/getLostList",async (req,res)=>{
    const lostList = [];

    try{
        const lostListSnapshot = await lostListCollectionRef.get();
        
        const proimises = lostListSnapshot.docs.map(async (doc)=>{
            const adDoc = await adColectionRef.doc(doc.data().ad_id).get();
            if(adDoc.exists){
                const user = await userColectionRef.doc(adDoc.data().user_id).get();
                const petListSnapshot = await petCollectionRef.where("ad_id","==",doc.data().ad_id).get();
                petListSnapshot.forEach((petDoc)=>{
                    lostList.push({
                        "lost_id":doc.id,
                        "ad_id":doc.data().ad_id,
                        "status":doc.data().status,
                        "address":petDoc.data().address,
                        "city":petDoc.data().city,
                        "neighborhood":petDoc.data().neighborhood,
                        "age":petDoc.data().age,
                        "breed":petDoc.data().breed,
                        "description":petDoc.data().description,
                        "gender":petDoc.data().gender,
                        "image":petDoc.data().image,
                        "type":petDoc.data().type,
                        "name":petDoc.data().name,
                        "date":petDoc.data().date,
                        "senderName":user.data().name,
                        "senderID":user.id,
                        "sender-email:":user.data().email,
                        "sender-phone":user.data().phone,

                    })
                })
            }
            else{
                console.log("adDoc not found") 
            }
        })
        const results = await Promise.all(proimises)
        results.flat().filter(Boolean).forEach(pet => lostList.push(pet));
        res.status(200).send(lostList)
        //res.status(200).json({lostList:lostList})
    }
    
    catch(err){
        console.log(err)
        res.status(500).json({"error":`${err}`})
    
    }


    /*Output Example NOTE: Inside the array there will be multiple objects 
    lostList:{
        [
            {
                "lost_id": "mK2rUVva6M9DS1Orpfle",
                "ad_id": "AdTwo",
                "status": false,
                "address": "....İstanbul",
                "city":"İstanbul"
                "neighborhood":"Çekmeköy",
                "age": "3",
                "breed": "Samoyed",
                "description": "TEST 00:49 03/01/2024",
                "gender":"male",
                "image":"image url",
                "type":"Dog",
                "name": "Sirke",
                "date":petDoc.data().date,
                "senderName": "Oğuzhan",
                "senderID": "UserOne"
            }
        ]
    }
    */
})


app.post("/postLostListByAdId",async (req,res)=>{
    const lostList = [];
    try{
        const ad = await adColectionRef.doc(req.body.adid).get();
        const user = await usersCollectionRef.doc(ad.data().user_id).get();
        const lostListSnapshot = await lostListCollectionRef.where("ad_id","==",req.body.adid).get();
        const lostListPromises = lostListSnapshot.docs.map(async (doc)=>{
            const petListsSnapshot = await petCollectionRef.where("ad_id","==",doc.data().ad_id).get();
            const pets= petListsSnapshot.docs.map((petDoc)=>({
                "lost_id": doc.id,
                "ad_id": doc.data().ad_id,
                "status": doc.data().status,
                "address": petDoc.data().address,
                "city":petDoc.data().city,
                "neighborhood":petDoc.data().neighborhood,
                "age": petDoc.data().age,
                "breed": petDoc.data().breed,
                "description": petDoc.data().description,
                "gender":petDoc.data().gender,
                "date":petDoc.data().gender,
                "image": petDoc.data().image,
                "type":petDoc.data().type,
                "name": petDoc.data().name,
                "date":petDoc.data().date,
                "senderName":user.data().name,
                "senderID":user.id
            }));
            lostList.push(...pets);
        })
        await Promise.all(lostListPromises);
        console.log(lostList);
        res.status(200).send(lostList)
    }
    catch(err){
        console.log(err)
        res.status(500).json({"error":`${err}`})

    }
    /*Output Example- NOTE: Inside the array there will be multiple objects for each pet
    [
        {
            lost_id: 'mK2rUVva6M9DS1Orpfle',
            ad_id: 'AdTwo',
            status: false,
            address: ".....Antalya",
            "city":"Antalya",
            "neighborhood":"Kepez",
            age: '3',
            breed: 'Samoyed',
            description: 'TEST 00:49 03/01/2024',
            gender:"male",
            image: 'Test Link',
            "type":"Zeytin",
            name: 'Dog',
            "date":petDoc.data().date,
            "senderName": "Oğuzhan",
            "senderID": "UserOne"
        }
    ]
    */
    
})


app.get("/getApprovedLostList",async (req,res)=>{
    const lostList = [];
    try{
        // 2 is approved status
        const lostListSnapshot = await lostListCollectionRef.where("status","==",2).get();
        const promises=lostListSnapshot.docs.map(async (doc)=>{
            const petListSnapshot = await petCollectionRef.where("ad_id","==",doc.data().ad_id).get();
            petListSnapshot.docs.map((petDoc)=>{
                lostList.push({
                    "lost_id":doc.id,
                    "ad_id":doc.data().ad_id,
                    "address":petDoc.data().address, 
                    "city":petDoc.data().city,
                    "neighborhood":petDoc.data().neighborhood,                   
                    "age":petDoc.data().age,
                    "breed":petDoc.data().breed,
                    "description":petDoc.data().description,
                    "gender":petDoc.data().gender,
                    "status":doc.data().status,
                    "image":petDoc.data().image,
                    "type":petDoc.data().type,
                    "name":petDoc.data().name,
               
                })

            })
        })
        await Promise.all(promises);
        console.log(lostList)
        res.status(200).send(lostList)
    }catch(err){
        console.log(err)
        res.status(500).json({"error":`${err}`})

    }
    
})


app.post("/postLostListByUserId",authenticateToken,async (req,res)=>{
    const lostList = [];
    try {
        const adListSnapshot = await adColectionRef
            .where("user_id", "==", req.body.userid)
            .where("ad_type", "==", "Lost")
            .get();
        const user = await userColectionRef.doc(req.body.userid).get();
        const promisesAll = adListSnapshot.docs.map(async (doc) => {
            const lostListSnapshot = await lostListCollectionRef.where("ad_id", "==", doc.id).get();
            
            const petsPromises = lostListSnapshot.docs.map(async (lostDoc) => {
                const petListSnapshot = await petCollectionRef.where("ad_id", "==", lostDoc.data().ad_id).get();
                
                return petListSnapshot.docs.map(petDoc => ({
                    "lost_id": lostDoc.id,
                    "ad_id": lostDoc.data().ad_id,
                    "status": lostDoc.data().status,
                    "address": petDoc.data().address, 
                    "city":petDoc.data().city,
                    "neighborhood":petDoc.data().neighborhood,
                    "age": petDoc.data().age,
                    "breed": petDoc.data().breed,
                    "description": petDoc.data().description,
                    "gender": petDoc.data().gender,
                    "image": petDoc.data().image, 
                    "type":petDoc.data().type,
                    "name": petDoc.data().name,
                    "date":petDoc.data().date,
                    "senderName":user.data().name,
                    "senderID":user.id
                }));
            });

            const petsResults = await Promise.all(petsPromises);
            return petsResults.flat();
        });

        const results = await Promise.all(promisesAll);
        results.flat().filter(Boolean).forEach(petData => lostList.push(petData));
        console.log("lostList:", lostList);
        res.status(200).send(lostList);
    } catch (err) {
        console.log(err);
        res.status(500).json({ "error": `${err}` });
    }
})


app.post("/updateLost",authenticateToken,async (req,res)=>{
    try{
        let result = "Notification Not Sent .."
        const lost = await lostListCollectionRef.doc(req.body.lost_id).get();
        if(lost.get("status")!=req.body.status){
            await lostListCollectionRef.doc(req.body.lost_id).update({
                status:req.body.status
            })
            if(req.body.status==2){
                result=await NotificationSystemLostPet(req.body.senderID,req.body.ad_id,req.body.image,req.body.city,req.body.neighborhood)
                console.log(result)
            }
            
        }
        

        const petlist = await petCollectionRef.where("ad_id","==",req.body.ad_id).get();
        await petCollectionRef.doc(petlist.docs[0].id).update({
            address:req.body.address,
            age:req.body.age,
            breed:req.body.breed,
            city:req.body.city,
            neighborhood:req.body.neighborhood,
            description:req.body.description,
            gender:req.body.gender,
            image:req.body.image,
            name:req.body.name,
            type:req.body.type

        })
        console.log("Lost Updated...")
        res.status(200).json({"success":"Success","notification":result})  
        
       
    }
    catch(err){
        console.log(err)
        res.status(500).json({"error":`${err}`})
    }
    

})


app.post("/deleteLost",authenticateToken,async (req,res)=>{
    try{
        const petlist = await petCollectionRef.where("ad_id","==",req.body.ad_id).get();
        await petCollectionRef.doc(petlist.docs[0].id).delete();
        await lostListCollectionRef.doc(req.body.lost_id).delete();
        await adColectionRef.doc(req.body.ad_id).delete();
        console.log("Lost Deleted...")
        res.status(200).json({"success":"Success"})  
        
       
    }
    catch(err){
        console.log(err)
        res.status(500).json({"error":`${err}`})
    }
    

})


/*

app.post("/updateLostStatus",app.use(bodyParser.json()),async (req,res)=>{
    const lostList = [];
    try{
        const lostListSnapshot = await lostListCollectionRef.where("ad_id","==",req.body.adid).get();
        lostListSnapshot.forEach((doc)=>{
            lostList.push(doc.data())
        })
        if(lostList.length>0){
            lostListCollectionRef.doc(lostList[0].lost_id).update({
                status:req.body.status
            }).then(()=>{
                res.status(200).send("Status Updated")
            }).catch((err)=>{
                res.status(400).send("Status Could Not Updated")
            })
        }else{
            res.status(400).send("Status Could Not Updated")
        }
    }catch(err){
        console.log(err)
        res.status(500).json({"error":`${err}`})

    }
})
*/



// User API's


app.get("/getUsers",authenticateToken ,async (req, res) => {
    try {
        const usersSnapshot = await usersCollectionRef.get();
        const users = [];
        console.log("istedi:",req.uid)
        for (const doc of usersSnapshot.docs) {
            const mailboxSnapshot = await doc.ref.collection("mailbox").get();
            const mailboxData = mailboxSnapshot.docs.map(mailboxDoc => mailboxDoc.data());

            const userData = {
                user_id: doc.id,
                user_name: doc.data().user_name,
                name: doc.data().name,
                surname: doc.data().surname,
                email: doc.data().email,
                phone: doc.data().phone,
                address: doc.data().address,
                password: doc.data().password,
                city: doc.data().city,
                mailbox: mailboxData
            };

            users.push(userData);
        }

        res.status(200).json({ users: users });
    } catch (err) {
        console.log(err);
        res.status(500).json({ error: `${err}` });
    }
});

app.post("/postUserRegister",async (req,res)=>{
    /*
        input example
        {
            user_name:"oguzhan123",
            name:"Oğuzhan",
            surname:"Göksu",
            email:"oguzhan.goksu@example.com,
            phone:"05321234567",
            address:"....Döşemealtı/Antalya",
            password:"123456",
            city:"Antalya"

        }
    */
    try{
        const user= await usersCollectionRef.where("user_name","==",req.body.user_name).get();
        if((await usersCollectionRef.where("user_name","==",req.body.user_name).get()).docs.length>0){
            console.log("user:",user.docs)
            res.status(400).send("User name already exists")

        }
        else if((await usersCollectionRef.where("email","==",req.body.email).get()).docs.length>0){
            res.status(400).send("Email already exists")
        }
        else{
            // create mailbox collection for user
            const mailboxId = firestoreAutoId.autoId();
            const passwordHash=await hashPassword(req.body.password);
            const user = await admin.auth().createUser({
                email: req.body.email,
                passwordHash: passwordHash,
                displayName: req.body.user_name

            
            });
            const token = jwt.sign({ uid: user.uid }, secretKey);
            await admin.auth().setCustomUserClaims(user.uid, { passwordHash: passwordHash,token:token });
            console.log('Successfully created new user:', user.uid);
            await usersCollectionRef.doc(user.uid).set({
                user_name:req.body.user_name,
                name:req.body.name,
                surname:req.body.surname,
                email:req.body.email,
                phone:req.body.phone,
                address:req.body.address,
                password:passwordHash,
                city:req.body.city
            });
            await usersCollectionRef.doc(user.uid).collection("mailbox").doc(mailboxId).set({
                message: "Welcome to Peata",
                date: admin.firestore.Timestamp.now()
            });
            


            res.status(200).send({message:"User Registered"})
                                    
        }
    }catch(err){
        console.log(err)
        res.status(500).json({"error":`${err}`})
    }
})

app.post("/postUserLogin",async (req,res)=>{
    const {email, password} = req.body;
    try{
        const passwordHash= await hashPassword(password);
        const userCredential = await signInWithEmailAndPassword(email,passwordHash);
        if(await bcrypt.compare(password, userCredential.customClaims.passwordHash)===false){
            return res.status(400).json({error:"Password is incorrect"})
        }
        const token = jwt.sign({ uid: userCredential.uid }, secretKey);
        console.log('Token',token);
        await admin.auth().setCustomUserClaims(userCredential.uid, { passwordHash:userCredential.customClaims.passwordHash,token: token });
        console.log('Successfully logged in:', userCredential);
        return res.status(200).send({message:"User Logged In",token:token,user:userCredential})


    }catch(err){
        console.log(err)
        return res.status(500).json({"error":`${err}`})
    }
})


app.post("/postUserById",async (req,res)=>{
    try{
        console.log("req.uid:",req.uid)
        const user = await usersCollectionRef.doc(req.body.userid).get();
        
        if(user.exists){
            const mailboxSnapshot = await user.ref.collection("mailbox").get();
            const mailboxData = mailboxSnapshot.docs.map(mailboxDoc => mailboxDoc.data());
            const userData = {
                user_id: user.id,
                user_name: user.data().user_name,
                name: user.data().name,
                surname: user.data().surname,
                email: user.data().email,
                phone: user.data().phone,
                address: user.data().address,
                password: user.data().password,
                city: user.data().city,
                mailbox: mailboxData
            };
            res.status(200).send(userData)
        }
        else{
            res.status(400).send("User not found")
        }
    }catch(err){
        console.log(err)
        res.status(500).json({"error":`${err}`})
    }
})

app.post("/updateUser",authenticateToken,async (req,res)=>{
    try{

        console.log(req.body)
        
        await usersCollectionRef.doc(req.body.user_id).update({
            user_name:req.body.user_name,
            name:req.body.name,
            surname:req.body.surname,
            email:req.body.email,
            phone:req.body.phone,
            address:req.body.address,
            password:req.body.password,
            city:req.body.city
        })
        res.status(200).send("User Updated")
    }catch(err){
        console.log(err)
        res.status(500).json({"error":`${err}`})
    }

})

app.post("/deleteUser",authenticateToken,async (req,res)=>{
    try{
        await usersCollectionRef.doc(req.body.user_id).delete();
        res.status(200).send("User Deleted")
    }catch(err){
        console.log(err)
        res.status(500).json({"error":`${err}`})
    }
})

// Ad List API's


app.get("/getAdList",authenticateToken,async (req,res)=>{
    const adList = [];
    try{
        const adListSnapshot = await adColectionRef.get();
        adListSnapshot.forEach((doc)=>{
            adList.push(doc.data())
        })
        res.status(200).json({adList:adList})
    }
    catch(err){
        console.log(err)
        res.status(500).json({"error":`${err}`})

    }
})

app.post("/postAdListByUserId",authenticateToken,async (req,res)=>{
    const adList = [];
    try{
        const adListSnapshot = await adColectionRef.where("user_id","==",req.body.userid).get();
        const userListSnapShot = await usersCollectionRef.doc(req.body.userid).get();
        adListSnapshot.forEach((doc)=>{
            adList.push(doc.data())
        })
        if(req.body.userid==null || req.body.userid==undefined || req.body.userid==""){
            res.status(400).send("Need to fill userid")
        }
        else if(!userListSnapShot.exists){
            res.status(400).send("User not found")
        }
        else if(adList.length==0){
            res.status(400).send("This user has no ad yet")
        }
        else{
            res.status(200).send(adList)
        }
    }catch(err){
        console.log(err)
        res.status(500).json({"error":`${err}`})

    }
})

// Pet List API's

app.get("/getPetList",async (req,res)=>{
    const petList = [];
    try{
        const petListSnapshot = await petCollectionRef.get();
        petListSnapshot.forEach((doc)=>{
            petList.push(doc.data())
        })
        res.status(200).json({petList:petList})
    }catch(err){
        console.log(err)
        res.status(500).json({"error":`${err}`})

    }
})


app.post("/postPetListByAdId",authenticateToken,async (req,res)=>{
    const petList = [];
    try{
        const petListSnapshot = await petCollectionRef.where("ad_id","==",req.body.adid).get();
        petListSnapshot.forEach((doc)=>{
            petList.push(doc.data())
        })
        res.status(200).send(petList)
    }catch(err){
        console.log(err)
        res.status(500).json({"error":`${err}`})

    }
})




app.post("/postPetListByUserId",authenticateToken,async (req,res)=>{
    const petList = [];
    const ad_id_list = [];
    try{
        const userListSnapShot = await usersCollectionRef.doc(req.body.userid).get();
        const AdListSnapshot = await adColectionRef.where("user_id","==",req.body.userid).get();
        AdListSnapshot.forEach((doc)=>{
            ad_id_list.push(doc.id)
        })
        if(req.body.userid==null || req.body.userid==undefined || req.body.userid==""){
            res.status(400).send("Need to fill userid")
        }
        else if(!userListSnapShot.exists){
            res.status(400).send("User not found")
        }
    
        else if(ad_id_list.length==0){
            res.status(400).send("This user has no ad yet")
        }
        else{
            const petListSnapshot = await petCollectionRef.where("ad_id","in",ad_id_list).get();
            petListSnapshot.forEach((doc)=>{
                petList.push(doc.data())
            })
            console.log("petList:",petList)
            res.status(200).send(petList)
        }
    }catch(err){
        console.log(err)
        res.status(500).json({"error":`${err}`})

    }
})


// Mailbox API's


app.post("/mailboxByUserId",authenticateToken,async (req,res)=>{
    if(req.body.userid==null || req.body.userid==undefined || req.body.userid==""){
        req.body.userid=req.uid;
    }
    const mailboxList = [];
    const userRef = userColectionRef.doc(req.body.userid);
    const mailboxSnapshot = await userRef.collection('mailbox').get();
    mailboxSnapshot.docs.map((doc)=>{
        mailboxList.push({
            "mailbox_id":doc.id,
            "ad_id":doc.data().ad_id,
            "date":doc.data().date,
            "image":doc.data().image,
            "message":doc.data().message,
            "read":doc.data().read,
            "sender_username":doc.data().sender_username,
            "sender_id":doc.data().sender_id,
            
        })
    })
    res.status(200).send(mailboxList)
})

app.post("/changeReadByMailboxId",authenticateToken,async (req,res)=>{
    /*Input Example 
        {
            userid:"123456789",
            mailboxid:"123456789"
        }
    */
    console.log("userid",req.body.userid)
    console.log("mailboxid",req.body.mailboxid)
    console.log("enson buraya girdi")
    try{
        const userRef = userColectionRef.doc(req.body.userid);
        const mailboxRef = userRef.collection('mailbox').doc(req.body.mailboxid);
        const mailboxSnapshot = await mailboxRef.get();
        if(mailboxSnapshot.exists){
            mailboxRef.update({
                read:true
            }).then(()=>{
                res.status(200).send("Read Status Updated")
            }).catch((err)=>{
                res.status(400).send("Read Status Could Not Updated")
            })
        }
    }
    catch(err){
        console.log(err)
        res.status(500).json({"error":`${err}`})
    }

})

// Image Predict API

app.post('/AIPredict', async function (req, res) {
    /* Input format:
        {"imageLink": "https://firebasestorage.googleapis.com/v0/b/deneme-300d0.appspot.com/o/UserOne%2Favatar.svg1708974611622?alt=media&token=5a2c5859-3ec2-474b-9976-249662a49bdc}
    */
    try{
        console.log(req.body.imageLink)
        const imageLink= await req.body.imageLink; 
        const pythonProcess = spawn('python', ['PredictImage.py'], { stdio: ['pipe', 'pipe', process.stderr] });
    
        pythonProcess.stdin.write(imageLink);
        pythonProcess.stdin.end();
        let predictions= '';


        pythonProcess.stdout.on('data', (data) => {
            predictions += data.toString();
            console.log('Predictions:', predictions);//Burası silinecek
            
        });
        pythonProcess.on('error', (error) => {
            console.error('Error executing Python script:', error);
            res.status(400).json({ error: 'Bad request' });
        });
        pythonProcess.on('close', (code) => {
            if (code === 0) {
                result=handlePrediction(predictions)
                res.status(200).json(result)
            }
            else{
                console.error(`Python process exited with code ${code}`);
                res.status(400).json({ error: 'Bad request' });
            }
            
        });
        

        
    }catch (error) {
        console.error('Error processing request:', error);
        res.status(400).json({ error: 'Bad request' });
    }
})

// City API's
app.post("/postDistricts",async (req,res)=>{
    try{
        const distrcitList = await cityCollectionRef.doc(req.body.city).get();
        if(distrcitList.exists){
            res.status(200).send(distrcitList.data())
        }
        else{
            res.status(400).send("City not found")
        }
    }
    catch(err){
        console.log(err)
        res.status(500).json({"error":`${err}`})
    }
})





//Functions

async function NotificationSystemAdoptionPet(userid,adid,image,city,neighborhood) {
    try{
        const userRef = await userColectionRef.doc(userid).get(); 
        const userSnapshot = await userColectionRef.where("city","==",city).get();

        userSnapshot.docs.map(async (doc)=>{
            
            if(doc.id != userid){
                const date = new Date();
                const message = "There is someone around you who wants to find homes for stray animals!!!";

                const reciverRef = userColectionRef.doc(doc.id);
                const reciverMailboxRef = reciverRef.collection('mailbox');

                const mailboxId = firestoreAutoId.autoId();

                reciverMailboxRef.doc(mailboxId).set({
                    sender_username:userRef.data().user_name,
                    sender_id:userid,
                    ad_id:adid,
                    image:image,
                    message:message,
                    read:false,
                    date:date,
                    neighborhood:neighborhood
                })
            }
        
        })
        return "Adoption Pet Notification Sent";
    }
    catch(err){
        console.log(err)
        return "Adoption Pet Notification Could Not Sent";
    }
}
async function NotificationSystemLostPet(userid,adid,image,city,neighborhood) {
    try{
        const userRef = await userColectionRef.doc(userid).get(); 
        const userSnapshot = await userColectionRef.where("city","==",city).get();

        userSnapshot.docs.map((doc)=>{
            if(doc.id!=userid){
                const date = new Date();
                const message = "Someone around you has a lost pet !!!";

                const reciverRef = userColectionRef.doc(doc.id);
                const reciverMailboxRef = reciverRef.collection('mailbox');
                
                const mailboxId = firestoreAutoId.autoId();
                reciverMailboxRef.doc(mailboxId).set({
                    sender_username:userRef.data().user_name,
                    sender_id:userid,
                    ad_id:adid,
                    image:image,
                    message:message,
                    read:false,
                    date:date,
                    neighborhood:neighborhood
                })
            }
            
        })
        return "Lost Pet Notification Sent";
    }
    catch(err){
        console.log(err)
        return "Lost Pet Notification Could Not Sent";
    }
}

async function getStatus(status) {
    if(status=="null"||status==null){
        return null;
    }
    else if(status=="true"||status==true){
        return true;
    }
    else{
        return false;
    }
}


function handlePrediction(predictions){
    index1 = predictions.indexOf('&%/()', 0);
    index2 = predictions.indexOf('&%/()', index1+5);
    const prediction1 = predictions.slice(index1+5, index2);

    return {"prediction": prediction1}
}



// Admin Panel API
/*
app.post('/adminPanel/adminLogin', async (req, res) => {
    const { email, password } = req.body;
    try {
        const userCredential = await admin.auth().getUserByEmail(req.body.email);
        console.log("Admin Logged In")
        console.log(userCredential.user)    
        const user = userCredential.user;
        const idToken = await user.getIdToken();
        console.log("Admin Logged In")
        res.json({ idToken });
    } catch (error) {
        console.error('Error signing in:', error);
        res.status(400).json({ error: 'Invalid email or password' });
    }
  });
app.get('/api/protected', verifyToken, (req, res) => {
  // If token is verified, req.user will contain user information
  res.send(`Hello, ${req.user.name}`);
});

  */
//
app.post("/adminPanel/adminRegister",async (req,res)=>{
    const {email, password, name} = req.body;
    try {
        const passwordHash=await hashPassword(password);
        const user = await admin.auth().createUser({
            email:email,
            displayName: name,
            password:password
        
        });
        await admin.auth().setCustomUserClaims(user.uid, { passwordHash: passwordHash,token:token });
        console.log('Successfully created new admin:', user.uid);
        adminCollectionRef.doc(user.uid).set({
            email:req.body.email,
            password:passwordHash,
            name:req.body.name,
            surname:req.body.surname,
            user_name:req.body.user_name,

        })
        res.status(200).json({ message: 'Admin created successfully' });
    } catch (error) {
        console.error('Error creating new user:', error);
        res.status(400).json({ error: 'Error creating new user' });
    }

})


app.post("/adminPanel/adminLogin",async (req,res)=>{
    const {email, password} = req.body;
    
    try {
        const passwordHash= await hashPassword(password);
        const userCredential = await signInWithEmailAndPassword(email, passwordHash);
        if(await bcrypt.compare(password, userCredential.customClaims.passwordHash)===false){
            return res.status(400).json({error:"Password is incorrect"})
        }
        const token = jwt.sign({ uid: userCredential.uid }, secretKey);
        admin.auth().setCustomUserClaims(userCredential.uid, { passwordHash:userCredential.customClaims.passwordHash,token: token });
        //console.log("Admin Logged In",userCredential)
        return res.status(200).json({ userCredential:userCredential,token:token  });
    } catch (error) {
        console.error('Error signing in:', error);
        return res.status(400).json({ error: 'Invalid email or password' });
    }
})

// Admin Panel Functions

async function authenticateToken(req, res, next) {
    const token = await req.headers['authorization']||req.headers['Authorization'];
    if (token == null) return res.status(401).json({ error: 'Unauthorized' });

    jwt.verify(token, secretKey, async(err, decoded) => {
        if (err){ 
            console.log("err",err)  
            return res.status(403).json({ error: 'Invalid token' });
        }
        
        console.log("decoded.uid:",decoded.uid)
        try{
            const user = await admin.auth().getUser(decoded.uid);
            if(user.customClaims.token==token){
                req.uid = decoded.uid;
                next();
            }
            else{
                return res.status(403).json({ error: 'Invalid token' });
            }
            
        }catch(err){
            console.log(err)
            return res.status(403).json({ error: 'Invalid token' });
        }
    });
}
async function signInWithEmailAndPassword(email, password) {
    try {
        const userRecord = await admin.auth().getUserByEmail(email);
        // For demonstration purposes, you should replace the password validation logic with your actual implementation
        const validPassword = validatePassword(userRecord, password);
        
        if (validPassword) {
            return userRecord;
        } else {
            throw new Error('Invalid password');
        }
    } catch (error) {
      console.error('Error finding user:', error.message);
      throw error;
    }
  }

async function validatePassword(userRecord, password) {
  
    const storedPasswordHash = userRecord.customClaims.passwordHash; // Replace with actual field name where password hash is stored
    const providedPasswordHash = await hashPassword(password); // Replace with your own password hashing function
    return storedPasswordHash === providedPasswordHash;
}
async function hashPassword(password) {
    // Generate a salt and hash the password
    const saltRounds = 10; // Adjust according to your security requirements
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    return hashedPassword;
}

app.use('/AdminPanel/css', express.static(__dirname + '/AdminPanel/css'));
// Admin Panel 
app.get("/adminLogin",(req,res)=>{
    res.sendFile(__dirname +'/AdminPanel/login.html')
})
app.get("/adminPanel",(req,res)=>{
    
    res.sendFile(__dirname +'/AdminPanel/index.html')
    
})
app.get("/adminPanel/adoption",(req,res)=>{

    res.sendFile(__dirname +'/AdminPanel/adoption.html')
})
app.get("/adminPanel/adoption/:ad_id",async (req,res)=>{
    res.sendFile(__dirname +'/AdminPanel/adoptionItem.html')
})
app.get("/adminPanel/newAdoption",async (req,res)=>{
    res.sendFile(__dirname +'/AdminPanel/newAdoption.html')
})
app.get("/adminPanel/lost",(req,res)=>{
    res.sendFile(__dirname +'/AdminPanel/lost.html')
})
app.get("/adminPanel/lost/:ad_id",async (req,res)=>{
    res.sendFile(__dirname +'/AdminPanel/lostItem.html')
})
app.get("/adminPanel/newLost",async (req,res)=>{
    res.sendFile(__dirname +'/AdminPanel/newLost.html')
})
app.get("/adminPanel/user",(req,res)=>{
    res.sendFile(__dirname +'/AdminPanel/user.html')
})
app.get("/adminPanel/user/:user_id",async (req,res)=>{
    res.sendFile(__dirname +'/AdminPanel/userItem.html')
})

  



app.listen(3000, () => {
    console.log('Server running on port 3000')
})



