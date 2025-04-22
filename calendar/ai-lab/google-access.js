"use strict";

/**
 * GoogleAccess provides methods to interact with Google APIs (Calendar, Drive, Sheets).
 * @module GoogleAccess
 */

const ACCESS_TOKEN_SUFFIX = ".AccessToken";
const ACCESS_TOKEN_EXPIRES_AT_SUFFIX = ".AccessTokenExpiresAt";

/**
 * @typedef {Object} AuthData
 * @property {string} client_id
 * @property {string} client_secret
 * @property {string} refresh_token
 * @property {string} grant_type
 */

/**
 * GoogleAccess handles OAuth2 and API requests for Google services.
 */
export class GoogleAccess {
  /**
   * @param {string} name
   * @param {string} clientId
   * @param {string} clientSecret
   * @param {string} refreshToken
   */
  constructor(name, clientId, clientSecret, refreshToken) {
    this.name = name;
    this.accessTokenKey = `${name}${ACCESS_TOKEN_SUFFIX}`;
    this.accessTokenExpiresAtKey = `${name}${ACCESS_TOKEN_EXPIRES_AT_SUFFIX}`;
    /** @type {AuthData} */
    this.authData = {
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    };
    /** @type {string} */
    this.accessToken = "";
    /** @type {number} */
    this.accessTokenExpiresAt = 0;
  }

  /**
   * Initializes the access token.
   * @returns {Promise<string>}
   */
  init() {
    return this._resolveAccessToken();
  }

  /**
   * Fetches events from a Google Calendar.
   * @param {string} calendar
   * @param {Record<string, string>} query
   * @returns {Promise<any>}
   */
  eventsOf(calendar, query) {
    return this._resolveAccessToken().then(() =>
      this._getJson(
        `https://www.googleapis.com/calendar/v3/calendars/${calendar}/events`,
        query
      )
    );
  }

  /**
   * Fetches files from Google Drive.
   * @param {Record<string, string>} query
   * @returns {Promise<any>}
   */
  files(query) {
    return this._resolveAccessToken().then(() =>
      this._getJson("https://www.googleapis.com/drive/v3/files", query)
    );
  }

  /**
   * Fetches data from a Google Spreadsheet.
   * @param {string} spreadsheetId
   * @param {string} range
   * @returns {Promise<any>}
   */
  dataOf(spreadsheetId, range) {
    return this._resolveAccessToken().then(() =>
      this._getJson(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}`,
        {
          valueRenderOption: "UNFORMATTED_VALUE",
          dateTimeRenderOption: "FORMATTED_STRING",
        }
      )
    );
  }

  /**
   * Resolves and refreshes the access token if needed.
   * @returns {Promise<string>}
   * @private
   */
  _resolveAccessToken() {
    return new Promise((resolve, reject) => {
      const nowMillis = Date.now();
      if (!this.accessTokenExpiresAt) {
        this.accessToken = sessionStorage.getItem(this.accessTokenKey) || "";
        this.accessTokenExpiresAt =
          Number(sessionStorage.getItem(this.accessTokenExpiresAtKey)) ||
          nowMillis - 1;
      }
      if (this.accessTokenExpiresAt < nowMillis) {
        this._postJson(
          "https://www.googleapis.com/oauth2/v4/token",
          this.authData
        )
          .then((auth) => {
            this.accessToken = auth.access_token;
            this.accessTokenExpiresAt = nowMillis + auth.expires_in * 1000;
            sessionStorage.setItem(this.accessTokenKey, this.accessToken);
            sessionStorage.setItem(
              this.accessTokenExpiresAtKey,
              String(this.accessTokenExpiresAt)
            );
            console.debug(`access token refreshed for '${this.name}'`);
            resolve(this.accessToken);
          })
          .catch(reject);
      } else {
        resolve(this.accessToken);
      }
    });
  }

  /**
   * Sends a POST request with form data.
   * @param {string} url
   * @param {Record<string, string>} data
   * @returns {Promise<any>}
   * @private
   */
  _postJson(url, data) {
    return this._ajax(
      "POST",
      url,
      { "Content-Type": "application/x-www-form-urlencoded" },
      data
    );
  }

  /**
   * Sends a GET request with query parameters.
   * @param {string} url
   * @param {Record<string, string>} query
   * @returns {Promise<any>}
   * @private
   */
  _getJson(url, query) {
    return this._ajax(
      "GET",
      url,
      { Authorization: `Bearer ${this.accessToken}` },
      query
    );
  }

  /**
   * Sends an AJAX request.
   * @param {"GET"|"POST"} method
   * @param {string} url
   * @param {Record<string, string>} headers
   * @param {Record<string, string>} [data]
   * @returns {Promise<any>}
   * @private
   */
  _ajax(method, url, headers, data) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      let payload = null;
      if (data) {
        payload = Object.keys(data)
          .map(
            (key) =>
              `${encodeURIComponent(key)}=${encodeURIComponent(data[key])}`
          )
          .join("&");
      }
      let requestUrl = url;
      if (method === "GET" && payload) {
        requestUrl += "?" + payload;
      }
      xhr.open(method, requestUrl, true);
      Object.entries(headers).forEach(([key, value]) =>
        xhr.setRequestHeader(key, value)
      );
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 400) {
          resolve(JSON.parse(xhr.responseText));
        } else {
          reject(xhr.responseText);
        }
      };
      xhr.onerror = () => {
        reject(xhr.responseText);
      };
      if (method === "POST") {
        xhr.send(payload);
      } else {
        xhr.send();
      }
    });
  }
}

export const ga = new GoogleAccess(
  "cblistna",
  "1043527471308-e4sb65ute0jda6dh6bjtflru1tkn21ht.apps.googleusercontent.com",
  "olF2_9TK9Bbx-lXfySvqVIAR",
  "1//09VRcQIU93WIsCgYIARAAGAkSNwF-L9IrOIRxB2ADgzYpau_iv5T9kpKQLJLj8gTN_ozkQ9WL34sahThAUZmGCSrrp0MXLZPKfyo"
);
