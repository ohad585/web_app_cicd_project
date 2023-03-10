import request from "supertest";
import server from "../app";
import mongoose from "mongoose";
import Post from "../models/post_model";
import User from "../models/user_model";
import { closeSocketServer } from "../socket_server"

const message = "this is my test message";
let sender = "1234567890";
let retId = "";

const email = "test@a.com";
const password = "1234567890";
let accessToken = "";


const serverCleanup = async () => {
  return new Promise<void>((resolve) => {
    server.close(() => {
      resolve()
    })
  })
}

beforeAll(async () => {
  //clear Posts collection
  await Post.remove({ sender: sender });
  await User.remove({ email: email });
});

afterAll(async () => {
  await Post.deleteMany({ sender: sender });
  await User.deleteMany({ email: email });
  await closeSocketServer()
  await serverCleanup()
  await mongoose.connection.close();
});

describe("This is Post API test", () => {
  test("Test register to get access token", async () => {
    const response = await request(server)
      .post("/auth/register")
      .send({ email: email, password: password });
    expect(response.statusCode).toEqual(200);
    accessToken = response.body.access_token;

    expect(accessToken).not.toBeNull();
    sender = response.body._id;
  });

  test("Test Post get API", async () => {
    const response = await request(server).get("/post");
    expect(response.statusCode).toEqual(200);
  });

  test("Test Post post API", async () => {
    const response = await request(server)
      .post("/post")
      .set({ authorization: "barer " + accessToken })
      .send({
        text: message,
        sender: sender,
      });
    expect(response.statusCode).toEqual(200);

    const retMessage = response.body.message;
    const retSender = response.body.sender;
    retId = response.body._id;

    expect(retMessage).toEqual(message);
    expect(retSender).toEqual(sender);
    expect(retId).not.toEqual(null);
  });

  test("Test Post post no db API", async () => {
    await mongoose.connection.close()
    const response = await request(server)
      .post("/post")
      .set({ authorization: "barer " + accessToken })
      .send({
        test: message,
        sender: sender,
      });
    expect(response.statusCode).not.toEqual(200);
    await mongoose.connect(process.env.DATABASE_URL)
  });

  // test("Test get Post by id API", async () => {
  //   const response = await request(server).get("/post/" + retId);
  //   expect(response.statusCode).toEqual(200);
  //   const retMessage = response.body.message;
  //   const retSender = response.body.sender;
  //   const retId2 = response.body._id;
  //   expect(retMessage).toEqual(message);
  //   expect(retSender).toEqual(sender);
  //   expect(retId2).toEqual(retId);
  // });

  test("Test get Post by id with bad id", async () => {
    const response = await request(server).get("/post/" + retId+'1');
    expect(response.statusCode).not.toEqual(200);
  });

  // test("Test get Post by id with null id", async () => {
  //   const response = await request(server).get("/post/ ");
  //   expect(response.statusCode).not.toEqual(200);
  // });



  test("Test get Post by sender API", async () => {
    const response = await request(server).get("/post?sender=" + sender);
    expect(response.statusCode).toEqual(200);
    const retMessage = response.body[0].message;
    const retSender = response.body[0].sender;
    const retId2 = response.body[0]._id;
    expect(retMessage).toEqual(message);
    expect(retSender).toEqual(sender);
    expect(retId2).toEqual(retId);
  });


  // test("Test update post message by id API", async () => {
  //   const newMsg = 'new message'
  //   let response = await request(server)
  //     .post("/post/updateMessage/" + retId)
  //     .set({ authorization: "barer " + accessToken })
  //     .send({"update":newMsg});
  //   expect(response.statusCode).toEqual(200);

  //   response = await request(server).get("/post/" + retId);
  //   expect(response.statusCode).toEqual(200);
  //   const retMessage = response.body.message;
  //   const retId2 = response.body._id;
  //   expect(retMessage).toEqual(newMsg);
  //   expect(retId2).toEqual(retId);
  // });  

  test("Test update post message by id with bad id API", async () => {
    const newMsg = 'new message'
    const response = await request(server)
      .post("/post/updateMessage/" + retId+ "1")
      .set({ authorization: "barer " + accessToken })
      .send({"update":newMsg});

    expect(response.statusCode).not.toEqual(200);

  }); 
  test("Test update post message by id with null id API", async () => {
    const newMsg = 'new message'
    const response = await request(server)
      .post("/post/updateMessage/")
      .set({ authorization: "barer " + accessToken })
      .send({"update":newMsg});
      
    expect(response.statusCode).not.toEqual(200);

  });   


  // test("Test delete post by id API", async () => {
  //   const response = await request(server)
  //     .delete("/post/" + retId)
  //     .set({ authorization: "barer " + accessToken });
  //   expect(response.statusCode).toEqual(200);

  //   const response2 = await request(server).get("/post/" + retId);
  //   expect(response2.statusCode).toEqual(400);
  // });
  test("Test delete post by id when id is bad API", async () => {
    const response = await request(server)
      .delete("/post/" + retId +"1" )
      .set({ authorization: "barer " + accessToken });
    expect(response.statusCode).not.toEqual(200);
  });
  test("Test delete post by id when id is null API", async () => {
    const response = await request(server)
      .delete("/post/" )
      .set({ authorization: "barer " + accessToken });
    expect(response.statusCode).not.toEqual(200);
  });
});
