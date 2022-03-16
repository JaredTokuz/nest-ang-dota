## TODO

1. Fix cron controller =>
   task scheduler from the other project service & controller
   move the cron to that 1 service
   (DONE)

!) Fucking doozie man, Bug: fix the footer for schedule html

2. Frontend More =>
   Routes => Create 3 routes, about, cron, home (the analytics cards and everything)
   task scheduler frontend : readonly table of all the jobs, 2 each
   search-engine component & search-engine service/store
   (done) (no routing? just single page multi tabs) no, fixed routing supported good
   tab1 summary report (1 game at a time random query)
   tab2 aggregate runs the aggregate level 3 design

3. Run Docker container running both processes & port only the frontend =>
   one docker container that runs both apps and only exposes the frontend,
   then deploy to heroku and test

# BoilerplateNestAng

This project was generated with [Angular CLI](https://github.com/angular/angular-cli) version 13.1.2.

## Development server

Run `ng serve` for a dev server. Navigate to `http://localhost:4200/`. The app will automatically reload if you change any of the source files.

## Code scaffolding

Run `ng generate component component-name` to generate a new component. You can also use `ng generate directive|pipe|service|class|guard|interface|enum|module`.

## Build

Run `ng build` to build the project. The build artifacts will be stored in the `dist/` directory.

## Running unit tests

Run `ng test` to execute the unit tests via [Karma](https://karma-runner.github.io).

## Running end-to-end tests

Run `ng e2e` to execute the end-to-end tests via a platform of your choice. To use this command, you need to first add a package that implements end-to-end testing capabilities.

## Further help

To get more help on the Angular CLI use `ng help` or go check out the [Angular CLI Overview and Command Reference](https://angular.io/cli) page.

# dota-nest-ang
