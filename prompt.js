'use strict';
var _ = require('lodash');
var rx = require('rx-lite-aggregates');
var util = require('util');
var runAsync = require('run-async');
var utils = require('../utils/utils');
var Base = require('./baseUI');


var PromptUI = module.exports = function(prompts, opt) {
    Base.call(this, opt);
    this.prompts = prompts;
};
util.inherits(PromptUI, Base);

PromptUI.prototype.run = function(questions) {

    this.answers = {};


    if (_.isPlainObject(questions)) {
        questions = [questions];
    }


    var obs = _.isArray(questions) ? rx.Observable.from(questions) : questions;

    this.process = obs
        .concatMap(this.processQuestion.bind(this))

        .publish();

    this.process.connect();

    return this.process
        .reduce(function(answers, answer) {
            _.set(this.answers, answer.name, answer.answer);
            return this.answers;
        }.bind(this), {})
        .toPromise(Promise)
        .then(this.onCompletion.bind(this));
};


PromptUI.prototype.onCompletion = function(answers) {
    this.close();

    return answers;
};

PromptUI.prototype.processQuestion = function(question) {
    question = _.clone(question);
    return rx.Observable.defer(function() {
        var obs = rx.Observable.of(question);

        return obs
            .concatMap(this.setDefaultType.bind(this))
            .concatMap(this.filterIfRunnable.bind(this))
            .concatMap(utils.fetchAsyncQuestionProperty.bind(null, question, 'message', this.answers))
            .concatMap(utils.fetchAsyncQuestionProperty.bind(null, question, 'default', this.answers))
            .concatMap(utils.fetchAsyncQuestionProperty.bind(null, question, 'choices', this.answers))
            .concatMap(this.fetchAnswer.bind(this));
    }.bind(this));
};

PromptUI.prototype.fetchAnswer = function(question) {
    var Prompt = this.prompts[question.type];
    this.activePrompt = new Prompt(question, this.rl, this.answers);
    return rx.Observable.defer(function() {
        return rx.Observable.fromPromise(this.activePrompt.run().then(function(answer) {
            return { name: question.name, answer: answer };
        }));
    }.bind(this));
};

PromptUI.prototype.setDefaultType = function(question) {

    if (!this.prompts[question.type]) {
        question.type = 'input';
    }
    return rx.Observable.defer(function() {
        return rx.Observable.return(question);
    });
};

PromptUI.prototype.filterIfRunnable = function(question) {
    if (question.when === false) {
        return rx.Observable.empty();
    }

    if (!_.isFunction(question.when)) {
        return rx.Observable.return(question);
    }

    var answers = this.answers;
    return rx.Observable.defer(function() {
        return rx.Observable.fromPromise(
            runAsync(question.when)(answers).then(function(shouldRun) {
                if (shouldRun) {
                    return question;
                }
            })
        ).filter(function(val) {
            return val != null;
        });
    });
};