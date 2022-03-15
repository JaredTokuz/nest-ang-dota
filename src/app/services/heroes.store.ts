import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';
import { Hero, sortHeroesById } from '../model/heroes';
import { catchError, map, shareReplay, tap } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';
import { LoadingService } from '../loading/loading.service';
import { MessagesService } from '../messages/messages.service';
import { share } from 'rxjs';

@Injectable({
    providedIn: 'root',
})
export class HeroesStore {
    private subject = new BehaviorSubject<Hero[]>([]);

    public heroes$: Observable<Hero[]> = this.subject
        .asObservable()
        .pipe(share());

    constructor(
        private http: HttpClient,
        private loading: LoadingService,
        private messages: MessagesService
    ) {
        this.loadAllHeroess();
    }

    private loadAllHeroess() {
        const loadHeroes$ = this.http
            .get<Hero[]>('/api/dota-constants/heroes?simple=true')
            .pipe(
                map((response) => response['payload']),
                catchError((err) => {
                    const message = 'Could not load heroes';
                    this.messages.showErrors(message);
                    console.log(message, err);
                    return of([]);
                }),
                tap((heroes) => this.subject.next(heroes))
            );

        this.loading.showLoaderUntilCompleted(loadHeroes$).subscribe();
    }
}
