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

  // Save role
  static saveRole(roles) {
    localStorage.setItem("roles", JSON.stringify(roles));
  }

  // Get roles from local storage
  static getRoles() {
    const roles = localStorage.getItem("roles");
    return roles ? JSON.parse(roles) : null;
  }

  // Check if the user has a specific role
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
    return {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };
  }

  // Register user
  static async registerUser(registrationData) {
    const resp = await axios.post(
      `${this.BASE_URL}/auth/register`,
      registrationData,
    );
    return resp.data;
  }

  // Login user
  static async loginUser(loginData) {
    const resp = await axios.post(`${this.BASE_URL}/auth/login`, loginData);
    return resp.data;
  }

  static async getOwnProfile() {
    const resp = await axios.get(`${this.BASE_URL}/users/account`, {
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
    const url = `${this.BASE_URL}/users`;

    try {
      const resp = await axios.get(url, {
        headers: this.getHeader(),
        params: {
          limit,
          offset,
          sortField,
          direction,
          username,
        },
      });
      return resp.data;
    } catch (error) {
      console.error("Error fetching problems:", error);
      throw error;
    }
  }

  static async getProblemByUsername(username) {
    const resp = await axios.get(`${this.BASE_URL}/users/${username}`);
    return resp.data;
  }

  /******************* Problems **************************** */
  static async getAllProblems({
    limit = 10,
    offset = 0,
    sortField = "id",
    direction = "asc",
    title = "",
  } = {}) {
    const url = `${this.BASE_URL}/problems`;

    try {
      const resp = await axios.get(url, {
        headers: this.getHeader(),
        params: {
          limit,
          offset,
          sortField,
          direction,
          title,
        },
      });
      return resp.data;
    } catch (error) {
      console.error("Error fetching problems:", error);
      throw error;
    }
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
      headers: {
        ...this.getHeader(),
        "Content-Type": "multipart/form-data",
      },
    });
    return resp.data;
  }

  static async updateProblem(formData) {
    const resp = await axios.put(`${this.BASE_URL}/problems`, formData, {
      headers: {
        ...this.getHeader(),
        "Content-Type": "multipart/form-data",
      },
    });
    return resp.data;
  }

  static async deleteProblem(id) {
    const resp = await axios.delete(`${this.BASE_URL}/problems/${id}`, {
      headers: this.getHeader(),
    });
    return resp.data;
  }

  static async executeCode(languageId, sourceCode, stdin, expectedOutput) {
    const resp = await axios.post(
      `${this.JUDGE0_BASE_URL}/submissions/?base64_encoded=false&wait=true`,
      {
        language_id: languageId,
        source_code: sourceCode,
        stdin: stdin,
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
