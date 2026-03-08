import axios from "axios";

export default class ApiService {
  static BASE_URL = "http://localhost:8090/api";
  static JUDGE0_BASE_URL = "http://localhost:2358";

  static saveToken(token) {
    localStorage.setItem("token", token);
  }

  static getToken() {
    return localStorage.getItem("token");
  }

  static saveRole(roles) {
    localStorage.setItem("roles", JSON.stringify(roles));
  }

  static getRoles() {
    const roles = localStorage.getItem("roles");
    return roles ? JSON.parse(roles) : null;
  }

  static hasRole(role) {
    const roles = this.getRoles();
    return roles ? roles.includes(role) : false;
  }

  static isAdmin() {
    return this.hasRole("ADMIN");
  }

  static isCreator() {
    return this.hasRole("CREATOR");
  }

  static isParticipant() {
    return this.hasRole("PARTICIPANT");
  }

  static logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("roles");
  }

  static isAuthenticated() {
    const token = this.getToken();
    return !!token;
  }

  static getHeader() {
    const token = this.getToken();
    if (token) {
      return {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      };
    }
    return { "Content-Type": "application/json" };
  }

  // ─── Auth ────────────────────────────────────────────────────────────────────

  static async registerUser(registrationData) {
    const resp = await axios.post(
      `${this.BASE_URL}/auth/register`,
      registrationData,
    );
    return resp.data;
  }

  static async loginUser(loginData) {
    const resp = await axios.post(`${this.BASE_URL}/auth/login`, loginData);
    return resp.data;
  }

  // ─── Users ───────────────────────────────────────────────────────────────────

  static async getOwnProfile() {
    const resp = await axios.get(`${this.BASE_URL}/users/account`, {
      headers: this.getHeader(),
    });
    return resp.data;
  }

  static async updateProfile(formData) {
    const resp = await axios.put(`${this.BASE_URL}/users/update`, formData, {
      headers: { ...this.getHeader(), "Content-Type": "multipart/form-data" },
    });
    return resp.data;
  }

  static async changePassword(passwordData) {
    const resp = await axios.put(
      `${this.BASE_URL}/users/change-password`,
      passwordData,
      { headers: { ...this.getHeader(), "Content-Type": "application/json" } },
    );
    return resp.data;
  }

  static async deactivateProfile() {
    const resp = await axios.delete(`${this.BASE_URL}/users/deactivate`, {
      headers: this.getHeader(),
    });
    return resp.data;
  }

  static async getAllUsers({
    limit = 10,
    offset = 0,
    sortField = "id",
    direction = "asc",
    username = "",
  } = {}) {
    const resp = await axios.get(`${this.BASE_URL}/users`, {
      headers: this.getHeader(),
      params: { limit, offset, sortField, direction, username },
    });
    return resp.data;
  }

  static async getUserByUsername(username) {
    const resp = await axios.get(`${this.BASE_URL}/users/${username}`, {
      headers: this.getHeader(),
    });
    return resp.data;
  }

  static async getUserByUserIdAsAdmin(userId) {
    const resp = await axios.get(`${this.BASE_URL}/admin/users/${userId}`, {
      headers: this.getHeader(),
    });
    return resp.data;
  }

  static async updateUserAsAdmin(formData) {
    const resp = await axios.put(`${this.BASE_URL}/admin/users`, formData, {
      headers: { ...this.getHeader(), "Content-Type": "multipart/form-data" },
    });
    return resp.data;
  }

  // ─── Problems ────────────────────────────────────────────────────────────────

  /**
   * Fetches a paginated list of problems.
   *
   * @param {object} options
   * @param {number}   options.limit      - Page size (default 10)
   * @param {number}   options.offset     - Row offset (default 0)
   * @param {string}   options.sortField  - Field to sort by (default "id")
   * @param {string}   options.direction  - "asc" | "desc" (default "asc")
   * @param {string}   options.title      - Optional title search filter
   * @param {string[]} options.tags       - Optional list of active tag names to filter by (AND semantics)
   * @param {string}   options.difficulty - Optional difficulty: "EASY" | "MEDIUM" | "HARD"
   */
  static async getAllProblems({
    limit = 10,
    offset = 0,
    sortField = "id",
    direction = "asc",
    title = "",
    tags = [],
    difficulty = "",
  } = {}) {
    // axios serialises repeated params as tags[]=… by default; Spring expects tags=a&tags=b
    const params = new URLSearchParams();
    params.append("limit", limit);
    params.append("offset", offset);
    params.append("sortField", sortField);
    params.append("direction", direction);
    if (title) params.append("title", title);
    if (difficulty) params.append("difficulty", difficulty);
    (tags || []).forEach((t) => params.append("tags", t));

    const resp = await axios.get(`${this.BASE_URL}/problems`, {
      headers: this.getHeader(),
      params,
    });
    return resp.data;
  }

  static async getProblemById(id) {
    const resp = await axios.get(`${this.BASE_URL}/problems/id/${id}`);
    return resp.data;
  }

  static async getProblemBySlug(slug) {
    const resp = await axios.get(`${this.BASE_URL}/problems/slug/${slug}`);
    return resp.data;
  }

  static async fetchFileContent(fileUrl) {
    const resp = await axios.get(`${this.BASE_URL}/files/fetch`, {
      params: { url: fileUrl },
    });
    return resp.data;
  }

  static async createProblem(formData) {
    const resp = await axios.post(`${this.BASE_URL}/problems`, formData, {
      headers: { ...this.getHeader(), "Content-Type": "multipart/form-data" },
    });
    return resp.data;
  }

  static async updateProblem(formData) {
    const resp = await axios.put(`${this.BASE_URL}/problems`, formData, {
      headers: { ...this.getHeader(), "Content-Type": "multipart/form-data" },
    });
    return resp.data;
  }

  /**
   * Replaces the tag set on a problem.
   * Accepts either tagNames (string[]) or tags ({id, name}[]).
   *
   * @param {number|string} problemId
   * @param {{ tagNames?: string[], tags?: {id:number,name:string}[] }} payload
   */
  static async updateProblemTags(problemId, payload) {
    const resp = await axios.patch(
      `${this.BASE_URL}/problems/${problemId}/tags`,
      payload,
      { headers: { ...this.getHeader(), "Content-Type": "application/json" } },
    );
    return resp.data;
  }

  static async deleteProblem(id) {
    const resp = await axios.delete(`${this.BASE_URL}/problems/${id}`, {
      headers: this.getHeader(),
    });
    return resp.data;
  }

  // ─── Tags ─────────────────────────────────────────────────────────────────────

  static async getTagById(id) {
    const resp = await axios.get(`${this.BASE_URL}/problem-tags/${id}`);
    return resp.data;
  }

  static async getAllTags({
    limit = 10,
    offset = 0,
    sortField = "id",
    direction = "asc",
    name = "",
  } = {}) {
    const resp = await axios.get(`${this.BASE_URL}/problem-tags`, {
      headers: this.getHeader(),
      params: { limit, offset, sortField, direction, name },
    });
    return resp.data;
  }

  static async createTag(data) {
    const resp = await axios.post(`${this.BASE_URL}/problem-tags`, data, {
      headers: { ...this.getHeader(), "Content-Type": "application/json" },
    });
    return resp.data;
  }

  static async updateTag(data) {
    const resp = await axios.put(`${this.BASE_URL}/problem-tags`, data, {
      headers: { ...this.getHeader(), "Content-Type": "application/json" },
    });
    return resp.data;
  }

  static async deleteTag(id) {
    const resp = await axios.delete(`${this.BASE_URL}/problem-tags/${id}`, {
      headers: this.getHeader(),
    });
    return resp.data;
  }

  static async toggleTagActive(id) {
    const resp = await axios.patch(
      `${this.BASE_URL}/problem-tags/toggle-active/${id}`,
      null,
      { headers: this.getHeader() },
    );
    return resp.data;
  }

  // ─── Submissions ─────────────────────────────────────────────────────────────
  static async createSubmission(data) {
    // data should match SubmissionDTO (problemId, sourceCode, language, etc.)
    const resp = await axios.post(`${this.BASE_URL}/submissions`, data, {
      headers: this.getHeader(),
    });
    return resp.data; // your backend wraps in Response<SubmissionDTO>
  }

  static async getMySubmissions({
    limit = 20,
    offset = 0,
    problemId = null,
  } = {}) {
    const resp = await axios.get(`${this.BASE_URL}/submissions/me`, {
      headers: this.getHeader(),
      params: { limit, offset, problemId },
    });
    return resp.data; // Response<Page<SubmissionDTO>>
  }

  // ─── Judge0 ──────────────────────────────────────────────────────────────────

  static async executeCode(languageId, sourceCode, stdin, expectedOutput) {
    const resp = await axios.post(
      `${this.JUDGE0_BASE_URL}/submissions/?base64_encoded=false&wait=true`,
      {
        language_id: languageId,
        source_code: sourceCode,
        stdin,
        expected_output: expectedOutput,
      },
    );
    return resp.data;
  }

  static async getLanguage(id) {
    const resp = await axios.get(`${this.JUDGE0_BASE_URL}/languages/${id}`);
    return resp.data;
  }
}
