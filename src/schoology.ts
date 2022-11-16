import { randomBytes } from "node:crypto";
import { parse } from "node:querystring";

const DEFAULT_SITE_BASE = "https://www.schoology.com";
const SCHOOLOGY_API_HOST = "https://api.schoology.com";
const REALM_PARAM = { "OAuth realm": "Schoology API" };

export interface Token {
  oauth_token: string;
  oauth_token_secret: string;
}

enum HttpMethod {
  GET = "GET",
  POST = "POST",
  PATCH = "PATCH",
  PUT = "PUT",
  DELETE = "DELETE",
}

enum SignatureMethod {
  HmacSha1 = "HMAC-SHA1",
  Plaintext = "PLAINTEXT",
}

enum SchoologyBoolean {
  False = 0,
  True = 1,
}

enum Gender {
  Male = "M",
  Female = "F",
}

enum Realm {
  School = "schools",
  Building = "buildings",
  User = "users",
  Group = "groups",
  Course = "courses",
  Section = "sections",
}

export interface Links {
  self: string;
}

export interface Event {
  id: number;
  title: string;
  description: string;
  start: string;
  has_end: number;
  end: string;
  all_day: number;
  editable: number;
  rsvp: number;
  comments_enabled: number;
  type: string;
  assignment_type: string;
  web_url: string;
  assignment_id: number;
  realm: string;
  section_id: number;
  links: Links;
}

export interface School {
  id: number;
  title: string;
  address1: string;
  address2: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  website: string;
  phone: string;
  fax: string;
  picture_url: string;
}

export interface User {
  uid: number;
  school_id: number;
  building_id: number;
  school_uid: number;
  name_title: string;
  name_title_show: SchoologyBoolean;
  name_first: string;
  name_first_preferred: string;
  name_middle: string;
  name_middle_show: string;
  name_last: string;
  name_display: string;
  username: string;
  primary_email: string;
  position: string;
  gender: Gender;
  grad_year: number;
  birthday_date: string;
  role_id: number;
  email_login_info: SchoologyBoolean;
  profile_url: string;
  tz_name: string;
  parents: User[];
  parent_uids: string;
  password: string;
  advisor_uids: string;
  child_uids: string;
  send_message: number;
  synced: SchoologyBoolean;
  profile_picture_fid: number;
  additional_buildings: string;
}

//TODO(jacobk999): Add more types
export interface Group {}

export interface Course {
  id: number;
  building_id: number;
  title: string;
  course_code: string;
  department: string;
  description: string;
  credits: number;
  synced: SchoologyBoolean;
  grade_level_range_start: number;
  grade_level_range_end: number;
  subject_area: number;
}

export interface Section {
  id: string;
  course_title: string;
  section_code: number;
  section_school_code: string;
  access_code: string;
  grading_periods: number[];
  description: string;
  profile_url: string;
  location: string;
  meeting_days: number[];
  start_time: string;
  end_time: string;
  class_periods: number[];
  options: {
    course_format: 1 | 2;
    weighted_grading_categories: SchoologyBoolean;
    upload_document: SchoologyBoolean;
    create_discussion: SchoologyBoolean;
    member_post: SchoologyBoolean;
    member_post_comment: SchoologyBoolean;
  };
  synced: SchoologyBoolean;
}

type RequestId = number | string;

class RealmClient<TRealm extends Realm, TStruct> {
  #client: Client;
  #realm: TRealm;

  constructor(client: Client, realm: TRealm) {
    this.#client = client;
    this.#realm = realm;
  }

  get(id: RequestId): Promise<TStruct> {
    return this.request<TStruct>(HttpMethod.GET, `/${id}`);
  }

  async list(): Promise<TStruct[]> {
    const response = await this.request<{ [key in TRealm]: TStruct[] }>(
      HttpMethod.GET,
      ""
    );

    return response[this.#realm];
  }

  /**
   *
   * @param id The id of the realm
   * @param startDate A date in the format YYYY-MM-DD
   * @param endDate A date in the format YYYY-MM-DD
   * @returns A list of events
   */
  async listEvents(
    id: RequestId,
    startDate: string,
    endDate?: string
  ): Promise<Event[]> {
    const params = new URLSearchParams();
    params.append("start_date", startDate);
    if (endDate) params.append("end_date", endDate);

    const { event } = await this.request<{ event: Event[] }>(
      HttpMethod.GET,
      `/${id}/events?${params.toString()}`
    );

    return event;
  }

  protected request<T>(
    method: HttpMethod,
    path: string,
    body?: any
  ): Promise<T> {
    return this.#client.request(method, `/${this.#realm}${path}`, body);
  }
}

class UserRealm extends RealmClient<Realm.User, User> {
  async getSections(id: RequestId) {
    const { section } = await this.request<{ section: Section[] }>(
      HttpMethod.GET,
      `/${id}/sections`
    );

    return section;
  }

  async getGroups(id: RequestId) {
    const { group } = await this.request<{ group: Group[] }>(
      HttpMethod.GET,
      `/${id}/groups`
    );

    return group;
  }
}

export interface ClientOptions {
  clientKey: string;
  clientSecret: string;
  siteBase?: string;
  apiHost?: string;
}

export class Client {
  #clientKey: string;
  #clientSecret: string;
  #siteBase: string;
  #apiBase: string;
  #oauthToken?: string;
  #oauthTokenSecret?: string;

  schools: RealmClient<Realm.School, School>;
  users: UserRealm;
  groups: RealmClient<Realm.Group, Group>;
  courses: RealmClient<Realm.Course, Course>;
  sections: RealmClient<Realm.Section, Section>;

  constructor({
    clientKey,
    clientSecret,
    siteBase = DEFAULT_SITE_BASE,
    apiHost,
  }: ClientOptions) {
    this.#clientKey = clientKey;
    this.#clientSecret = clientSecret;
    this.#siteBase = siteBase;
    this.#apiBase = `${apiHost || SCHOOLOGY_API_HOST}/v1`;

    this.schools = new RealmClient(this, Realm.School);
    this.users = new UserRealm(this, Realm.User);
    this.groups = new RealmClient(this, Realm.Group);
    this.courses = new RealmClient(this, Realm.Course);
    this.sections = new RealmClient(this, Realm.Section);
  }

  setToken(token: Token) {
    this.#oauthToken = token.oauth_token;
    this.#oauthTokenSecret = token.oauth_token_secret;
  }

  async getRequestToken(): Promise<Token> {
    const Authorization = this.#getUnsignedAuthHeader();

    const body = await fetch(this.#apiBase + "/oauth/request_token", {
      headers: { Authorization },
      method: "GET",
    }).then((response) => response.text());

    const token = parse(body) as unknown as Token;
    this.setToken(token);
    return token;
  }

  getConnectURL(redirectUrl: string) {
    return `${this.#siteBase}/oauth/authorize?oauth_token=${
      this.#oauthToken
    }&return_url=${redirectUrl}`;
  }

  async request<T>(method: HttpMethod, path: string, body?: any): Promise<T> {
    const url = this.#apiBase + path;
    const authHeader = this.#getPlaintextAuthHeader();

    const response = await fetch(url, {
      headers: { Authorization: authHeader },
      method,
      body,
    });

    const contentType = response.headers.get("content-type");

    if (contentType?.includes("application/json")) return response.json();

    return response.text() as unknown as T;
  }

  async getAccessToken(requestToken?: Token) {
    requestToken && this.setToken(requestToken);

    const response = await this.request<string>(
      HttpMethod.GET,
      "/oauth/access_token"
    );

    const token = parse(response) as unknown as Token;
    this.setToken(token);
    return token;
  }

  getUserInfo(accessToken?: Token) {
    accessToken && this.setToken(accessToken);
    return this.request(HttpMethod.GET, "/app-user-info");
  }

  #getAuthHeaderComponents(
    signatureMethod: SignatureMethod = SignatureMethod.Plaintext,
    token: string = ""
  ) {
    const nonce = randomBytes(16).toString("base64");
    const timestamp = Math.round(new Date().getTime() / 1000);

    return {
      oauth_consumer_key: this.#clientKey,
      oauth_nonce: nonce,
      oauth_signature_method: signatureMethod,
      oauth_timestamp: timestamp,
      oauth_token: token,
      oauth_version: "1.0",
    };
  }

  #getUnsignedAuthHeader() {
    return this.#headerFormat({
      ...REALM_PARAM,
      ...this.#getAuthHeaderComponents(),
      oauth_signature: this.#clientSecret + "%26",
    });
  }

  #getPlaintextAuthHeader() {
    const authHeaderComponents = this.#getAuthHeaderComponents(
      SignatureMethod.Plaintext,
      this.#oauthToken
    );

    const key = [this.#clientSecret, this.#oauthTokenSecret].join("&");

    return this.#headerFormat({
      ...REALM_PARAM,
      ...authHeaderComponents,
      oauth_signature: key,
    });
  }

  #headerFormat(components: Record<string, string | number>): string {
    const parts: string[] = [];
    Object.keys(components).forEach((key) =>
      parts.push(key + '="' + components[key] + '"')
    );

    return parts.join(",");
  }
}
