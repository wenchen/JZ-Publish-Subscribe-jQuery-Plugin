/*
 * pubsub v0.0.1
 * pub/sub for PIPOs.tv
 *
 * Thanks to Joe Zim http://www.joezimjs.com for original Publish/Subscribe plugin for jQuery
 * http://www.joezimjs.com/projects/publish-subscribe-jquery-plugin/
 *
*/

;(function ($) {
    'use strict';

    var subscriptions = {},
        ctx = {},
        publishing = false,

        clone = function(arr) {
            return arr.slice(0);
        };

    /**
     * jQuery.subscribe( topics, callback[, context] )
     * - topics (String): 1 or more topic names, separated by a space, to subscribe to
     * - callback (Function): function to be called when the given topic(s) is published to
     * - context (Object): an object to call the function on
     * - unsub (Function): function to be called when the given topics is unsubscribed
     * returns: { "topics": topics, "callback": callback } or null if invalid arguments
     */
    $.subscribe = function (topics, callback, context, unsub) {
        var topicArr,
            usedTopics = {};

        // If no context was set, assign an empty object to the context
        context = context || ctx;
        
        // Make sure that each argument is valid
        if ($.type(topics) !== "string" || !$.isFunction(callback)) {
            // If anything is invalid, return null
            return null;
        }

        // Split space-separated topics into an array of topics
        topicArr = topics.split(" ");

        // Iterate over each topic and individually subscribe the callback function to them
        $.each(topicArr, function (i, topic) {
            // If the topic is an empty string, skip it. This may happen if there is more than one space between topics
            // Also skip if this is a repeat topic (e.g. someone entered "topic1 topic1"). Otherwise mark it as used.
            if (topic === "" || usedTopics[topic]) {
                return true; // continue
            } else {
                // Mark the topic as used
                usedTopics[topic] = true;
            }

            // If the topic does not exist, create it
            if (!subscriptions[topic]) {
                subscriptions[topic] = [];
            }

            // Add the callback function to the end of the array of callbacks assigned to the specified topic
            subscriptions[topic].push([callback,context,unsub]);
        });

        // Return a handle that can be used to unsubscribe
        return { topics: topics, callback: callback, context:context, unsub: unsub };
    };

    /**
     * jQuery.unsubscribe( topics[, callback[, context]] )
     * - topics (String): 1 or more topic names, separated by a space, to unsubscribe from
     * - callback (Function): function to be removed from the topic's subscription list. If none is supplied, all functions are removed from given topic(s)
     * - context (Object): object that was used as the context in the jQuery.subscribe() call.
     */
    $.unsubscribe = function (topics, callback, context) {

        /* PIPOs.tv Hack: 不丟參數就全部unsubscribe */
        if (typeof topics === "undefined") {
            subscriptions = {};
            return $;
        }

        var topicArr,
            usedTopics = {};
            
        // topics must either be a string, or have a property named topics that is a string
        if (!topics || ($.type(topics) !== "string" && (!topics.topics || $.type(topics.topics) !== "string"))) {
            // If it isn't valid, return null
            return $;
        }

        // If the handler was used, then split the handle object into the two arguments
        if (topics.topics) {
            callback = callback || topics.callback;
            context = context || topics.context;
            topics = topics.topics;
        }
        
        // If no context was provided, then use the default context
        context = context || ctx;

        // Split space-separated topics into an array of topics
        topicArr = topics.split(" ");

        // Iterate over each topic and individually unsubscribe the callback function from them
        $.each(topicArr, function (i, topic) {
            var currTopic = subscriptions[topic];

            // If the topic is an empty string or doesn't exist in subscriptions, or is a repeat topic, skip it.
            // Otherwise mark the topic as used
            if (topic === "" || !currTopic || usedTopics[topic]) {
                return true; // continue
            } else {
                usedTopics[topic] = true;
            }

            // If no callback is given, then remove all subscriptions to this topic
            if (!callback || !$.isFunction(callback)) {
                var subs = clone(subscriptions[topic]);
                delete subscriptions[topic];
                $.each(subs, function(i, subscriptions) {
                    if($.isFunction(subscriptions[2])) {
                        subscriptions[2].call(subscriptions[1], topic);
                    }
                });
            } else {
                // Otherwise a callback is specified; iterate through this topic to find the correct callback
                $.each(currTopic, function (i, subscription) {
                    if (subscription[0] === callback && subscription[1] === context) {
                        currTopic.splice(i, 1);
                        if($.isFunction(subscription[2])) {
                            subscription[2].call(subscription[1], topic);
                        }
                        return false; // break
                    }
                });
            }
        });
        
        return $;
    };

    /**
     * jQuery.publish( topics[, data] )
     * - topics (String): the subscription topic(s) to publish to
     * - data: any data (in any format) you wish to give to the subscribers
     */
    $.publish = function (topics, data) {
        // Return null if topics isn't a string
        if (!topics || $.type(topics) !== "string") {
            return $;
        }

        // Split the topics up into an array of topics
        var topicArr = topics.split(" ");

        // Iterate over the topics and publish to each one
        $.each(topicArr, function (i, topic) {
            // If the topic is blank, skip to the next one
            if (topic === "") {
                return true; // continue
            }

            if (subscriptions[topic]) {
                // Clone the subscriptions we're publishing to so that we don't run into any errors if someone (un)subscribes during the publishing.
                var subs = clone(subscriptions[topic]);

                // Iterate over each subscriber and call the callback function
                $.each(subs, function (i, subscription) {
                    subscription[0].call(subscription[1], topic, data);
                });
            }
        });
        
        return $;
    };

}(jQuery));