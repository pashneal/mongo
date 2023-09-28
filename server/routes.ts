import { Filter, ObjectId } from "mongodb";

import { Router, getExpressRouter } from "./framework/router";

import { Post, User, WebSession } from "./app";
import { PostDoc } from "./concepts/post";
import { UserDoc } from "./concepts/user";
import { WebSessionDoc } from "./concepts/websession";

// Pre conditions
let is = {
  authorOf : {
    post: (_id: ObjectId) => {
       return {
        during : async (session: WebSessionDoc) => {
          const user = WebSession.getUser(session);
          const post = await Post.getById(_id );
          if (post === null) { throw new Error("Post does not exist"); }
          if (user !== post.author) {
            throw new Error("User is not the author of the post");
          }
        }
      }
    }
  }
}

class Routes {
  @Router.get("/session")
  async getSessionUser(session: WebSessionDoc) {
    const user = WebSession.getUser(session);
    return await User.getById(user);
  }

  @Router.get("/users")
  async getUsers() {
    return await User.getUsers();
  }

  @Router.get("/users/:username")
  async getUser(username: string) {
    return (await User.getUsers(username))[0];
  }

  @Router.post("/users")
  async createUser(session: WebSessionDoc, username: string, password: string) {
    WebSession.isLoggedOut(session);
    return await User.create(username, password);
  }

  @Router.patch("/users")
  async updateUser(session: WebSessionDoc, update: Partial<UserDoc>) {
    const user = WebSession.getUser(session);
    return await User.update(user, update);
  }

  @Router.post("/login")
  async logIn(session: WebSessionDoc, username: string, password: string) {
    const u = await User.authenticate(username, password);
    WebSession.start(session, u._id);
    return { msg: "Logged in!" };
  }

  @Router.post("/logout")
  async logOut(session: WebSessionDoc) {
    WebSession.end(session);
    return { msg: "Logged out!" };
  }

  @Router.get("/posts")
  async getPosts(query: Filter<PostDoc>) {
    return await Post.read(query);
  }

  @Router.post("/posts")
  async createPost(session: WebSessionDoc, content: string) {
    const user = WebSession.getUser(session);
    return await Post.create(user, content);
  }

  @Router.delete("/posts/:_id")
  async deletePost(session: WebSessionDoc, _id: ObjectId) {

    let preconditions = is.authorOf.post(_id).during(session);
    await preconditions;
    return await Post.delete(_id);
  }


}

export default getExpressRouter(new Routes());
