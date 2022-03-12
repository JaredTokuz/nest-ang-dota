import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';
import { Heroes, sortHeroesById } from '../model/heroes';
import { catchError, map, shareReplay, tap } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';
import { LoadingService } from '../loading/loading.service';
import { MessagesService } from '../messages/messages.service';
import { share } from 'rxjs';

@Injectable({
    providedIn: 'root',
})
export class HeroesStore {
    private subject = new BehaviorSubject<Heroes[]>([]);

    public heroes$: Observable<Heroes[]> = this.subject
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
            .get<Heroes[]>('/api/dota-constants/heroes?simple=true')
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
