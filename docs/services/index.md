#Catberry Services

In Catberry all framework components such as Logger or 
Universal HTTP(S) Request are called as services. 

Whole Catberry architecture is built using [Service Locator]
(http://en.wikipedia.org/wiki/Service_locator_pattern) pattern and 
[Dependency Injection](http://en.wikipedia.org/wiki/Dependency_injection).
Service Locator is a Catberry core component that knows every other Catberry 
component. All these components can ask Service Locator to get instance
of some other component. For example, every component and even userland 
catberry module can ask for a Logger to log messages to console.

When Catberry initializes itself it fills Service Locator with own set of
components, but framework users can also register own components and even
replace implementation of some Catberry components. For example, you can replace
Logger service in Locator with your own logger which sends messages 
to Graylog (or any other).
 
To register your own components you should keep in mind that 
you probably need different implementations of your component for server and browser 
if it depends on the environment.

Learn more how to use Service Locator in next section.

Read next:

* [Service Locator](service-locator.md)
