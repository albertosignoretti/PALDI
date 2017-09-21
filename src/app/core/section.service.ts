import { IState } from './state';
import { State } from 'app/core/state';
import { Http } from '@angular/http';
import { Section, ISection } from './section';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs/Observable';
import { Subscription } from 'rxjs/Subscription';
import { Subject } from 'rxjs/Subject';
import 'rxjs/add/observable/throw';
import 'rxjs/add/operator/map';
import 'rxjs/add/operator/catch';

import { HttpUtils } from '../common/http-utils';
import { FirebaseObjectObservable, AngularFireDatabase } from "angularfire2/database";
import * as firebase from 'firebase/app';
import { MdMenuTrigger, MdMenu, MdDialog } from "@angular/material";

import { PassDialog } from '../flow/pass-dialog/pass-dialog.component';
import { ErrorPassDialog } from '../flow/pass-dialog/error-pass-dialog.component';
import { environmentCstur } from '../../environments/environment-cstur';
import { environmentCasa } from '../../environments/environment-casa';
import { environmentLivroTeste } from '../../environments/environment-livroteste';

const urlPath = 'assets/server/';

@Injectable()
export class SectionService {
  private _currentSection: Section;
  private _currentState: State;
  private _subscription: Subscription;

  /** Observable to emit events when the current section changes */
  private _currentSource = new Subject<Section>();   // source
  current$ = this._currentSource.asObservable();   // stream

  /** Observable to emit events when the current state changes */
  private _currentStateSource = new Subject<State>();        // source
  currentState$ = this._currentStateSource.asObservable();   // stream

  private book: FirebaseObjectObservable<Partial<ISection>>;

  private app;
  private CASA: string = 'casa';
  private CSTUR: string = 'cstur';
  private LIVRO_TESTE: string = 'livroteste';

  constructor(private _http: Http, private db: AngularFireDatabase, public dialog: MdDialog) {
    firebase.initializeApp(environmentCasa.firebase, this.CASA);
    firebase.initializeApp(environmentCstur.firebase, this.CSTUR);
    firebase.initializeApp(environmentLivroTeste.firebase, this.LIVRO_TESTE);
    this.reset();
  }

  reset() {
    this.changeSection(new Section());
    this.setCurrentState(null);
  }

  load(file: string) {
    let url = urlPath + file;
    this._http.get(url)
      .map(HttpUtils.extractData)
      .catch(HttpUtils.handleError)
      .subscribe(
      data => {
        let sectionData = data as Section[];
        if (sectionData) {
          this.changeSection(new Section(sectionData));
        }
      },
      error => {
        console.log('error: ', error);
      }
    );
  }

  loadFromData(sectionData: Partial<ISection>) {
    this.changeSection(new Section(sectionData));
  }

  loadCasaFromFirebase() {
    // this.book = this.db.object('/book');
    // this.book.subscribe((data: Partial<ISection>) => {
    //   const section = new Section(data);
    //   section.origin = 'firebase';
    //   this.changeSection(section);
    // });

    this.app = firebase.app(this.CASA);
    console.log("app " + this.app.name);

    this.app.database().ref('/book').once('value').then(data => {
      const section = new Section(data.val());
      section.origin = 'firebase';
      this.changeSection(section);
    });
  }

  loadCSTURFromFirebase() {

    this.app = firebase.app(this.CSTUR);
    console.log("app " + this.app.name);

    this.app.database().ref('/book').once('value').then(data => {
      const section = new Section(data.val());
      section.origin = 'firebase';
      this.changeSection(section);
    });
  }

  loadLivroTesteFromFirebase() {

    this.app = firebase.app(this.LIVRO_TESTE);
    console.log("app " + this.app.name);

    this.app.database().ref('/book').once('value').then(data => {
      const section = new Section(data.val());
      section.origin = 'firebase';
      this.changeSection(section);
    });
  }

  set currentState(state: State) {
      this._currentState = state;
      this._currentStateSource.next(this._currentState);
  }

  // TODO remove
  private setCurrentState(state: State) {
    // if (state) {
      this._currentState = state;
      this._currentStateSource.next(this._currentState);
    // }
  }


  private changeSection(newSection: Section) {
    // changes the current Section and emits an event with the new changed Section.
    this._currentSection = newSection;
    this._currentSource.next(this._currentSection);

    if (this._currentSection.states.length > 0) {
      let initialState = this._currentSection.states.find(state => state.id == this._currentSection.initialState);
      this.currentState = initialState;
      // this.setCurrentState(initialState);
    }

    // remove the event subscription from the previous event and creates a new one with the new event.
    // if (this._subscription) {
    //   this._subscription.unsubscribe();
    // }
    // this._subscription = newSection.next$.subscribe(s => this.changeSection(s));
  }

  selectState(stateLabel: string) {
    let state = this._currentSection.getStateByLabel(stateLabel);
    if (state) {
      this.setCurrentState(state);
    }
  }

  get current() {
    return this._currentSection;
  }

  get currentState() {
    return this._currentState;
  }

  createState(stateData: IState): State {
    let state = this._currentSection.createState(stateData);
    this.setCurrentState(state);
    return state;
  }

  nextState() {
    if (this._currentState.behavior.onNext) {
      this._currentState.behavior.onNext();
    }
  }

  getApp() {

    switch(this._currentSection.title) {
      case "Casa do Aprender":
        this.app = firebase.app(this.CASA);
        break;

      case "CSTUR":
        this.app = firebase.app(this.CSTUR);
        break;

      case "Livro Teste":
        this.app = firebase.app(this.LIVRO_TESTE);
        break;

      default:
        this.app = undefined;
        break;
    }

    return this.app;
  }

  save() {
    let json = this._currentSection.toJson();
    //if (this._currentSection.origin == 'firebase') {

      let passDlg = this.dialog.open(PassDialog);

      passDlg.componentInstance.book = this._currentSection.title;
      passDlg.afterClosed().subscribe(pass => {

        switch(passDlg.componentInstance.book) {
          case "Casa do Aprender":
            this.saveCasaDoAprender(json, pass);
            break;

          case "CSTUR":
            this.saveCSTUR(json, pass);
            break;

          case "Livro Teste":
            this.saveLivroTeste(json, pass);
            break;

          default:
            console.log("livro sem senha");
            break;
        }
      });

    // }
    // else {
    //   console.log(json);
    // }
  }

  saveCasaDoAprender(json, pass) {
    if(pass === "casaAprenderUern2017") {
        this.app = firebase.app(this.CASA);
        this.app.database().ref('/book').set(JSON.parse(json));
    } else {
        console.log("senha errada");
        this.dialog.open(ErrorPassDialog);
    }
  }

  saveCSTUR(json, pass) {

    if(pass === "csturuern-2017") {
        this.app = firebase.app(this.CSTUR);
        this.app.database().ref('/book').set(JSON.parse(json));
    } else {
        console.log("senha errada");
        this.dialog.open(ErrorPassDialog);
    }

  }

  saveLivroTeste(json, pass) {

    if(pass === "livroteste") {
        this.app = firebase.app(this.LIVRO_TESTE);
        this.app.database().ref('/book').set(JSON.parse(json));
    } else {
        console.log("senha errada");
        this.dialog.open(ErrorPassDialog);
    }

  }

}
