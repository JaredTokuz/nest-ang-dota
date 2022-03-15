import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';
import { Hero, sortHeroesById } from '../model/heroes';
import { catchError, map, shareReplay, tap } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';
import { LoadingService } from '../loading/loading.service';
import { MessagesService } from '../messages/messages.service';
import { share } from 'rxjs';

export interface SelectedHero {
    constants?: Hero;
    summary?: any;
}

@Injectable({
    providedIn: 'root',
})
export class SelectedHeroStore {
    private subject = new BehaviorSubject<SelectedHero | null>(null);

    public hero$: Observable<SelectedHero> = this.subject
        .asObservable()
        .pipe(share());

    constructor() {}

    getSelected() {
        return this.subject.getValue();
    }

    select(hero?: Hero, summary?: any) {
        this.subject.next({
            constants: hero || null,
            summary: summary || null,
        });
    }

    clear() {
        this.subject.next(null);
    }
}
