import axios from "axios";

// Global 429 interceptor — dispatches a browser event so any React component can react
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 429) {
      const retryAfter = parseInt(error.response.headers["retry-after"] ?? "60", 10);
      const tier = error.response.headers["x-ratelimit-tier"] ?? "unknown";
      window.dispatchEvent(
        new CustomEvent("api:rate-limited", { detail: { seconds: retryAfter, tier } })
      );
    }
    return Promise.reject(error);
  }
);

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

  static async loginWithGoogle(idToken) {
    const resp = await axios.post(`${this.BASE_URL}/auth/google`, { idToken });
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

  static async getUserActivity(username) {
    const resp = await axios.get(
      `${this.BASE_URL}/users/${username}/activity`,
      {
        headers: this.getHeader(),
      },
    );
    return resp.data;
  }

  static async getUserStatistics(username) {
    const resp = await axios.get(
      `${this.BASE_URL}/users/${username}/statistics`,
      {
        headers: this.getHeader(),
      },
    );
    return resp.data;
  }

  static async getRatingHistory(username) {
    const resp = await axios.get(
      `${this.BASE_URL}/users/${username}/rating-history`,
      {
        headers: this.getHeader(),
      },
    );
    return resp.data;
  }

  // ─── Problems ────────────────────────────────────────────────────────────────
  static async getAllProblems({
    limit = 10,
    offset = 0,
    sortField = "id",
    direction = "asc",
    title = "",
    tags = [],
    difficulty = "",
  } = {}) {
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
    const resp = await axios.get(`${this.BASE_URL}/problems/id/${id}`, {
      headers: this.getHeader(),
    });
    return resp.data;
  }

  static async getProblemBySlug(slug) {
    const resp = await axios.get(`${this.BASE_URL}/problems/slug/${slug}`, {
      headers: this.getHeader(),
    });
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

  static async getSubmissionStatus(submissionId) {
    const resp = await axios.get(
      `${this.BASE_URL}/submissions/${submissionId}/status`,
      { headers: this.getHeader() },
    );
    return resp.data;
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

  // ─── LLM ──────────────────────────────────────────────────────────────────
  static async getHint(data) {
    const resp = await axios.post(`${this.BASE_URL}/hints`, data, {
      headers: this.getHeader(),
    });
    return resp.data;
  }

  static async extractProblemFromPdf(file) {
    const formData = new FormData();
    formData.append("file", file);
    const resp = await axios.post(
      `${this.BASE_URL}/problem-ai/extract-pdf`,
      formData,
      {
        headers: {
          Authorization: `Bearer ${this.getToken()}`,
          // Let browser set Content-Type with boundary for multipart
        },
        timeout: 120000,
      },
    );
    return resp.data;
  }

  static async generateTestCases(problemStatement, count) {
    const resp = await axios.post(
      `${this.BASE_URL}/problem-ai/generate-test-cases`,
      { problemStatement, count },
      { headers: this.getHeader(), timeout: 120000 },
    );
    return resp.data;
  }

  // ─── Visualizer ─────────────────────────────────────────────────────────────
  static async visualize({
    sourceCode,
    language,
    stdin = "",
    mode = "MANUAL",
  }) {
    const resp = await axios.post(
      `${this.BASE_URL}/visualize`,
      { sourceCode, language, stdin, mode },
      { headers: this.getHeader() },
    );
    return resp.data; // Response<VisualizerResponse>
  }

  // ─── Contests ────────────────────────────────────────────────────────────────

  static async getPublicContests({ page = 0, size = 20 } = {}) {
    const resp = await axios.get(`${this.BASE_URL}/contests`, {
      headers: this.getHeader(),
      params: { page, size },
    });
    return resp.data;
  }

  static async getContestById(id) {
    const resp = await axios.get(`${this.BASE_URL}/contests/${id}`, {
      headers: this.getHeader(),
    });
    return resp.data;
  }

  static async getContestBySlug(slug) {
    const resp = await axios.get(`${this.BASE_URL}/contests/slug/${slug}`, {
      headers: this.getHeader(),
    });
    return resp.data;
  }

  static async createContest(data) {
    const resp = await axios.post(`${this.BASE_URL}/contests`, data, {
      headers: this.getHeader(),
    });
    return resp.data;
  }

  static async updateContest(id, data) {
    const resp = await axios.put(`${this.BASE_URL}/contests/${id}`, data, {
      headers: this.getHeader(),
    });
    return resp.data;
  }

  static async deleteContest(id) {
    const resp = await axios.delete(`${this.BASE_URL}/contests/${id}`, {
      headers: this.getHeader(),
    });
    return resp.data;
  }

  static async registerForContest(id) {
    const resp = await axios.post(
      `${this.BASE_URL}/contests/${id}/register`,
      {},
      { headers: this.getHeader() },
    );
    return resp.data;
  }

  static async unregisterFromContest(id) {
    const resp = await axios.delete(
      `${this.BASE_URL}/contests/${id}/register`,
      { headers: this.getHeader() },
    );
    return resp.data;
  }

  static async isRegisteredForContest(id) {
    const resp = await axios.get(
      `${this.BASE_URL}/contests/${id}/is-registered`,
      { headers: this.getHeader() },
    );
    return resp.data;
  }

  static async getContestLeaderboard(id, { page = 0, size = 50 } = {}) {
    const resp = await axios.get(
      `${this.BASE_URL}/contests/${id}/leaderboard`,
      {
        headers: this.getHeader(),
        params: { page, size },
      },
    );
    return resp.data;
  }

  static async getMyContestRank(id, window = 3) {
    const resp = await axios.get(
      `${this.BASE_URL}/contests/${id}/leaderboard/me`,
      {
        headers: this.getHeader(),
        params: { window },
      },
    );
    return resp.data;
  }

  // ── Contest monitor (admin / creator) ─────────────────────────────────── //

  static async getContestMonitor(id) {
    const resp = await axios.get(`${this.BASE_URL}/contests/${id}/monitor`, {
      headers: this.getHeader(),
    });
    return resp.data; // Response<ContestMonitorDTO>
  }

  /**
   * Fetch all submissions of a participant in a contest.
   * @param {number} id       – contest id
   * @param {number} userId   – participant's user id
   * @param {number|null} problemId – optional filter to one problem
   */
  static async getContestMonitorSubmissions(id, userId, problemId = null) {
    const params = { userId };
    if (problemId != null) params.problemId = problemId;
    const resp = await axios.get(
      `${this.BASE_URL}/contests/${id}/monitor/submissions`,
      { headers: this.getHeader(), params },
    );
    return resp.data; // Response<List<SubmissionDTO>>
  }

  // ─── Organizations ──────────────────────────────────────────────────────────

  static async getOrganizations({ page = 0, size = 12, search = "" } = {}) {
    const resp = await axios.get(`${this.BASE_URL}/organizations`, {
      headers: this.getHeader(),
      params: { page, size, search },
    });
    return resp.data;
  }

  static async getMyOrganizations({ page = 0, size = 12 } = {}) {
    const resp = await axios.get(`${this.BASE_URL}/organizations/my`, {
      headers: this.getHeader(),
    });
    return resp.data;
  }

  static async getOrganizationBySlug(slug) {
    const resp = await axios.get(
      `${this.BASE_URL}/organizations/slug/${slug}`,
      { headers: this.getHeader() },
    );
    return resp.data;
  }

  static async createOrganization(data) {
    const resp = await axios.post(`${this.BASE_URL}/organizations`, data, {
      headers: this.getHeader(),
    });
    return resp.data;
  }

  static async updateOrganization(id, data) {
    const resp = await axios.put(
      `${this.BASE_URL}/organizations/${id}`,
      data,
      { headers: this.getHeader() },
    );
    return resp.data;
  }

  static async deleteOrganization(id) {
    const resp = await axios.delete(`${this.BASE_URL}/organizations/${id}`, {
      headers: this.getHeader(),
    });
    return resp.data;
  }

  static async joinOrganization(orgId, code = null) {
    const body = code ? { code } : {};
    const resp = await axios.post(
      `${this.BASE_URL}/organizations/${orgId}/join`,
      body,
      { headers: this.getHeader() },
    );
    return resp.data;
  }

  static async leaveOrganization(id) {
    const resp = await axios.delete(
      `${this.BASE_URL}/organizations/${id}/leave`,
      { headers: this.getHeader() },
    );
    return resp.data;
  }

  static async getOrganizationMembers(id, { page = 0, size = 20, search = "" } = {}) {
    const resp = await axios.get(
      `${this.BASE_URL}/organizations/${id}/members`,
      {
        headers: this.getHeader(),
        params: { page, size, search },
      },
    );
    return resp.data;
  }

  static async updateMemberRole(orgId, userId, role) {
    const resp = await axios.put(
      `${this.BASE_URL}/organizations/${orgId}/members/${userId}/role`,
      { role },
      { headers: this.getHeader() },
    );
    return resp.data;
  }

  static async removeMember(orgId, userId) {
    const resp = await axios.delete(
      `${this.BASE_URL}/organizations/${orgId}/members/${userId}`,
      { headers: this.getHeader() },
    );
    return resp.data;
  }

  static async searchNonMembers(orgId, q = "", { page = 0, size = 10 } = {}) {
    const resp = await axios.get(
      `${this.BASE_URL}/organizations/${orgId}/search-users`,
      {
        headers: this.getHeader(),
        params: { q, page, size },
      },
    );
    return resp.data;
  }

  static async addMember(orgId, userId) {
    const resp = await axios.post(
      `${this.BASE_URL}/organizations/${orgId}/members`,
      { userId },
      { headers: this.getHeader() },
    );
    return resp.data;
  }

  // ── Labs ──────────────────────────────────────────────────────────────── //

  static async getOrgLabs(orgId, { page = 0, size = 10 } = {}) {
    const resp = await axios.get(
      `${this.BASE_URL}/organizations/${orgId}/labs`,
      { headers: this.getHeader(), params: { page, size } },
    );
    return resp.data;
  }

  static async getOrgLab(orgId, slug) {
    const resp = await axios.get(
      `${this.BASE_URL}/organizations/${orgId}/labs/${slug}`,
      { headers: this.getHeader() },
    );
    return resp.data;
  }

  static async createLab(orgId, data) {
    const resp = await axios.post(
      `${this.BASE_URL}/organizations/${orgId}/labs`,
      data,
      { headers: this.getHeader() },
    );
    return resp.data;
  }

  static async updateLab(orgId, labId, data) {
    const resp = await axios.put(
      `${this.BASE_URL}/organizations/${orgId}/labs/${labId}`,
      data,
      { headers: this.getHeader() },
    );
    return resp.data;
  }

  static async deleteLab(orgId, labId) {
    const resp = await axios.delete(
      `${this.BASE_URL}/organizations/${orgId}/labs/${labId}`,
      { headers: this.getHeader() },
    );
    return resp.data;
  }

  static async getLabProgress(orgId, labId) {
    const resp = await axios.get(
      `${this.BASE_URL}/organizations/${orgId}/labs/${labId}/progress`,
      { headers: this.getHeader() },
    );
    return resp.data;
  }

  static async exportLabProgress(orgId, labId, format = "csv") {
    const resp = await axios.get(
      `${this.BASE_URL}/organizations/${orgId}/labs/${labId}/export`,
      { headers: this.getHeader(), params: { format }, responseType: "blob" },
    );
    return resp.data;
  }

  static async publishSolutions(orgId, labId) {
    const resp = await axios.post(
      `${this.BASE_URL}/organizations/${orgId}/labs/${labId}/publish-solutions`,
      {},
      { headers: this.getHeader() },
    );
    return resp.data;
  }

  // ── My Problems (lecturer repository) ─────────────────────────────────── //

  static async getMyProblems({ page = 0, size = 10, search = "" } = {}) {
    const resp = await axios.get(
      `${this.BASE_URL}/problems/my`,
      { headers: this.getHeader(), params: { page, size, search } },
    );
    return resp.data;
  }

  // ── Favorites ─────────────────────────────────────────────────────────── //

  static async getFavoriteProblems() {
    const resp = await axios.get(`${this.BASE_URL}/favorites`, {
      headers: this.getHeader(),
    });
    return resp.data; // Response<List<ProblemDTO>>
  }

  static async toggleFavorite(problemId) {
    const resp = await axios.post(
      `${this.BASE_URL}/favorites/${problemId}`,
      {},
      { headers: this.getHeader() },
    );
    return resp.data; // Response<ProblemFavoriteDTO> with isFavorited
  }

  // ── Comments ───────────────────────────────────────────────────────────── //

  static async getComments(problemId, page = 0, size = 10) {
    const resp = await axios.get(
      `${this.BASE_URL}/problems/${problemId}/comments`,
      { headers: this.getHeader(), params: { page, size } },
    );
    return resp.data;
  }

  static async createComment(problemId, { content, parentId = null }) {
    const resp = await axios.post(
      `${this.BASE_URL}/problems/${problemId}/comments`,
      { content, parentId },
      { headers: this.getHeader() },
    );
    return resp.data;
  }

  static async editComment(problemId, commentId, content) {
    const resp = await axios.put(
      `${this.BASE_URL}/problems/${problemId}/comments/${commentId}`,
      { content },
      { headers: this.getHeader() },
    );
    return resp.data;
  }

  static async deleteComment(problemId, commentId) {
    const resp = await axios.delete(
      `${this.BASE_URL}/problems/${problemId}/comments/${commentId}`,
      { headers: this.getHeader() },
    );
    return resp.data;
  }

  static async voteComment(problemId, commentId, voteType) {
    const resp = await axios.post(
      `${this.BASE_URL}/problems/${problemId}/comments/${commentId}/vote`,
      { voteType },
      { headers: this.getHeader() },
    );
    return resp.data;
  }

  static async getUserSubmissions(username, { limit = 20, offset = 0 } = {}) {
    const resp = await axios.get(`${this.BASE_URL}/users/${username}/submissions`, {
      headers: this.getHeader(),
      params: { limit, offset },
    });
    return resp.data;
  }

  static async getUserOrganizations(username, { page = 0, size = 12 } = {}) {
    const resp = await axios.get(`${this.BASE_URL}/users/${username}/organizations`, {
      headers: this.getHeader(),
      params: { page, size },
    });
    return resp.data;
  }

  static async getUserLanguageStats(username) {
    const resp = await axios.get(
      `${this.BASE_URL}/users/${username}/language-stats`,
      { headers: this.getHeader() },
    );
    return resp.data;
  }
}
