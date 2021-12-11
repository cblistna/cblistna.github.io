"use strict";

class GoogleAccess {
  constructor(name, clientId, clientSecret, refreshToken) {
    this.name = name;
    this.accessTokenKey = `${name}.AccessToken`;
    this.accessTokenExpiresAtKey = `${name}.AccessTokenExpiresAt`;
    this.authData = {
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    };
  }

  init() {
    return this._resolveAccessToken();
  }

  eventsOf(calendar, query) {
    return new Promise((resolve, reject) => {
      this._resolveAccessToken()
        .then(() => {
          this._getJson(
            `https://www.googleapis.com/calendar/v3/calendars/${calendar}/events`,
            query
          ).then(resolve);
        })
        .catch(reject);
    });
  }

  files(query) {
    return new Promise((resolve, reject) => {
      this._resolveAccessToken()
        .then(() => {
          this._getJson("https://www.googleapis.com/drive/v3/files", query).then(resolve);
        })
        .catch(reject);
    });
  }
  
  dataOf(spreadsheetId, range) {
    return new Promise((resolve, reject) => {
      this._resolveAccessToken()
        .then(() => {
          this._getJson(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}`, {
            valueRenderOption: 'UNFORMATTED_VALUE',
            dateTimeRenderOption: 'FORMATTED_STRING'
          }).then(resolve);
        })
        .catch(reject);
    });
  }

  _resolveAccessToken() {
    return new Promise((resolve, reject) => {
      const nowMillis = new Date().getTime();
      if (!this.accessTokenExpiresAt) {
        this.accessToken = sessionStorage.getItem(this.accessTokenKey) || "";
        this.accessTokenExpiresAt =
          sessionStorage.getItem(this.accessTokenExpiresAtKey) || nowMillis - 1;
      }
      if (this.accessTokenExpiresAt < nowMillis) {
        this._postJson("https://www.googleapis.com/oauth2/v4/token", this.authData)
          .then((auth) => {
            this.accessToken = auth.access_token;
            this.accessTokenExpiresAt = nowMillis + auth.expires_in * 1000;
            sessionStorage.setItem(this.accessTokenKey, this.accessToken);
            sessionStorage.setItem(
              this.accessTokenExpiresAtKey,
              this.accessTokenExpiresAt
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

  _postJson(url, data) {
    return this._ajax(
      "POST",
      url,
      { "Content-Type": "application/x-www-form-urlencoded" },
      data
    );
  }

  _getJson(url, query) {
    return this._ajax(
      "GET",
      url,
      { Authorization: `Bearer ${this.accessToken}`,
      },
      query
    );
  }

  _ajax(method, url, headers, data) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      if (data) {
        data = Object.keys(data)
          .map(
            (key) =>
              `${encodeURIComponent(key)}=${encodeURIComponent(data[key])}`
          )
          .join("&");
      }
      if (method === "GET") {
        url += "?" + data;
      }
      xhr.open(method, url, true);
      Object.keys(headers).forEach((key) =>
        xhr.setRequestHeader(key, headers[key])
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
        xhr.send(data);
      } else {
        xhr.send();
      }
    });
  }
}

const ga = new GoogleAccess(
  "cblistna",
  "1043527471308-e4sb65ute0jda6dh6bjtflru1tkn21ht.apps.googleusercontent.com",
  "olF2_9TK9Bbx-lXfySvqVIAR",
  "1//09VRcQIU93WIsCgYIARAAGAkSNwF-L9IrOIRxB2ADgzYpau_iv5T9kpKQLJLj8gTN_ozkQ9WL34sahThAUZmGCSrrp0MXLZPKfyo"
);
