import { Injectable } from '@angular/core';
import { OAuthService, OAuthEvent } from 'angular-oauth2-oidc';
import { BehaviorSubject, Observable, timer } from 'rxjs';
import { filter, map, switchMap } from 'rxjs/operators';
import * as moment from 'moment';
import jwtDecode from 'jwt-decode';
import { authConfig } from '../config/auth.config';
import { ErrorHandlingService } from './error-handling.service';

@Injectable({providedIn: 'root'})
export class AuthenticationService {
  private readonly _tokenProcessed = new BehaviorSubject<boolean>(false);

  constructor(private oauthService: OAuthService, private errorHandlingService: ErrorHandlingService) {
    // Initialize the oauth service with our auth config settings
    this.oauthService.configure(authConfig);
    /* Load the configuration from the discovery document and process the provided
    ID token if present.  Afterwards set _tokenProcessed to true so that anybody listening
    to tokenProcessed knows that the token has been processed.*/
    this.oauthService.loadDiscoveryDocumentAndTryLogin()
      .then(() => this._tokenProcessed.next(true))
      .catch(error => this.errorHandlingService.handleError(error, "Failed to load discovery document: Is your OIDC provider configured and running?"))

    // Configure automatic silent refresh
    this.oauthService.setupAutomaticSilentRefresh();
  }

  /** Emits once the discovery document has been loaded and the id token has been
   * processed, or immediately if subscribed to after the aforementioned has
   * already occurred. */
  public tokenProcessed(): Observable<void> {
      return this._tokenProcessed.pipe(
          filter(processed => processed === true),
          map(() => null)
        );
  }

  /** Redirects the user to the IdentityServer login page for implicit flow */
  public initImplicitFlow(): void {
    this.oauthService.initImplicitFlow();
  }
  public logOut(): void {
    this.oauthService.logOut();
  }

  /** Explicitly initiate silent refresh */
  public silentRefresh(): Promise<OAuthEvent> {
    return this.oauthService.silentRefresh();
  }

  /** Tells whether the user is currently authenticated with a valid, non-expired tokens */
  public get authenticated(): boolean {
    return this.oauthService.hasValidIdToken() && this.oauthService.hasValidAccessToken();
  }

  /** Claims included in the id token */
  public get idTokenClaims(): Object {
    return this.oauthService.getIdentityClaims();
  }

  /** Raw access token string */
  public get accessToken(): string {
    return this.oauthService.getAccessToken();
  }

  /** Claims included in the access token. */
  public get accessTokenClaims(): Object {
    return jwtDecode(this.oauthService.getAccessToken());
  }

  /** Expiration date of the access token */
  public get accessTokenExpiration() : moment.Moment {
    return moment(this.oauthService.getAccessTokenExpiration());
  }

  /** Expiration date of the id token */
  public get idTokenExpiration() : moment.Moment {
    return moment(this.oauthService.getIdTokenExpiration());
  }

  /** Reports whether the id token is currently expired */
  public get idTokenExpired(): boolean {
    return this.idTokenExpiration.isBefore(this.currentDate);
  }

  /** Reports whether the access token is currently expired */
  public get accessTokenExpired(): boolean {
    return this.accessTokenExpiration.isBefore(this.currentDate);
  }

  /** Reports the number of seconds until (or since, if negative)
   * the expiration of the id token */
  public get idTokenExpiresIn(): number {
    return this.idTokenExpiration.diff(this.currentDate, 'seconds');
  }

  /** Reports the number of seconds until (or since, if negative)
   * the expiration of the access token */
  public get accessTokenExpiresIn(): number {
    return this.accessTokenExpiration.diff(this.currentDate, 'seconds');
  }

  /** Private helper method which returns the current date for
   * expiration-related calculations */
  private get currentDate(): moment.Moment {
    return moment();
  }
}
