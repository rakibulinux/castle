import Store from "./store";
import GettersSetters from "./getters_setters";
import { applyMixins } from '../mixins';
import ZSmartModel from "@zsmartex/z-eventbus";
import ApiClient from "@zsmartex/z-apiclient";
import router from "@/router";
import { runNotice } from "@/mixins";

class UserController {
  store = Store;

  constructor() {
    ZSmartModel.on("user/LOGIN", () => {
      this.keep_session();
    });

    ZSmartModel.on("user/LOGOUT", () => {
      this.auth_error();

      router.push({ path: "/" });
  
      runNotice("success", "LOG OUT");
    })
  }

  get_session() {
    return new ApiClient("auth").get("resource/users/me");
  }

  keep_session() {
    setTimeout(async () => {
      try {
        if (this.state != "active") return;
        await this.get_session();

        this.keep_session();
      } catch (error) {
        return error;
      }
    }, 300000);
  }

  async login(payload: {
      email: string;
      password: string;
      otp_code?: string;
      captcha_response?: string;
    },
    url_callback?: string
  ) {
    this.state = "loading";

    try {
      const { data } = await new ApiClient("auth").post("identity/sessions", payload);

      this.auth_success(data, url_callback);
    } catch (error) {
      this.auth_error();
      return error;
    }
  }

  async get_logged() {
    this.state = "loading";

    try {
      const { data } = await this.get_session();

      this.auth_success(data);
    } catch (error) {
      this.auth_error();
      return error;
    }
  }

  async logout() {
    try {
      await new ApiClient("auth").delete("identity/sessions");
      ZSmartModel.emit("user/LOGOUT");
    } catch (error) {
      return error;
    }
  }

  private auth_success(payload, url_callback?: string) {
    if (payload.state != "active") {
      return runNotice("error", "User not ready to use");
    }

    this.state = payload.state;
    this.email = payload.email;
    this.uid = payload.uid;
    this.role = payload.role;
    this.level = payload.level;
    this.otp = payload.otp;

    this.need2fa = false;

    if (payload.csrf_token) localStorage.setItem("csrf_token", payload.csrf_token);

    ZSmartModel.emit("user/LOGIN");

    if (url_callback) router.push({ path: url_callback });
  }

  private auth_error() {
    this.state = null;
    localStorage.removeItem("csrf_token");
  }
}

interface UserController extends GettersSetters {
};

applyMixins(UserController, [GettersSetters]);
const class_mounted = new UserController();

export { UserController };

export default class_mounted;