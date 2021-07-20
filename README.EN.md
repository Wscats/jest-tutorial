[English](https://github.com/Wscats/jest-tutorial/blob/vm/README.EN.md) | [中文](https://github.com/Wscats/jest-tutorial/blob/vm/README.md)

# Explain the implementation principle of the Jest framework in a simple way

This article mainly provides you with an in-depth understanding of the operating principles behind Jest, which is convenient for responding to interviews and actual business needs. I believe we are already familiar with the preparation of Jest, but we may be very unfamiliar with how Jest works. Let us walk into Jest together. Inwardly, explore together. First attach the code to students in need, welcome to pay attention: [https://github.com/Wscats/jest-tutorial](https://github.com/Wscats/jest-tutorial/blob/vm/README.EN.md) 

# What is Jest

Jest is a Javascript testing framework developed by Facebook. It is a JavaScript library for creating, running and writing tests.

Jest is released as an NPM package and can be installed and run in any JavaScript project. Jest is currently one of the most popular test libraries for the front-end.

# What does testing mean

In technical terms, testing means checking whether our code meets certain expectations. For example: a function called sum (`sum`) should return the expected output given some operation result.

There are many types of tests, and you will soon be overwhelmed by the terminology, but the long story short tests fall into three categories:

- unit test
- Integration Testing
- E2E test

# How do I know what to test

In terms of testing, even the simplest code block may confuse beginners. The most common question is "how do I know what to test?".

If you are writing a web page, a good starting point is to test every page of the application and every user interaction. However, the web page also needs to be composed of code units such as functions and modules to be tested.

There are two situations most of the time:

- You inherit the legacy code, which has no built-in tests
- You must implement a new feature out of thin air

so what should I do now? In both cases, you can think of the test as: checking whether the function produces the expected result. The most typical test process is as follows:

- Import the function to be tested
- Give the function an input
- Define the desired output
- Check if the function produces the expected output

Generally, it's that simple. Master the following core ideas, writing tests will no longer be scary:

> Input -> Expected output -> Assertion result.

# Test blocks, assertions and matchers

We will create a simple Javascript function code for the addition of 2 numbers and write a corresponding Jest-based test for it

```js
const sum = (a, b) => a + b;
```

Now, for testing, create a test file in the same folder and name it `test.spec.js`. This special suffix is ​​a Jest convention and is used to find all test files. We will also import the function under test in order to execute the code under test. Jest tests follow the BDD style of tests. Each test should have a main `test` test block, and there can be multiple test blocks. Now you can write test blocks for the `sum` method. Here we write a test to add 2 Number and verify the expected result. We will provide the numbers 1 and 2, and expect 3 to be output.

`test` It requires two parameters: a string to describe the test block, and a callback function to wrap the actual test. `expect` wraps the objective function and combines it with the matcher `toBe` to check whether the calculation result of the function meets expectations.

This is the complete test:

```js
test("sum test", () => {
  expect(sum(1, 2)).toBe(3);
});
```

We observe the above code and find two points:

The `test` block is a separate test block, which has the function of describing and dividing the scope, that is, it represents a general container for the test we want to write for the calculation function `sum`. -`expect` is an assertion. This statement uses inputs 1 and 2 to call the `sum` method in the function under test, and expects an output of 3. -`toBe` is a matcher, used to check the expected value, if the expected result is not met, an exception should be thrown.

## How to implement a test block

The test block is actually not complicated. The simplest implementation is as follows. We need to store the callback function of the actual test of the test package, so we encapsulate a `dispatch` method to receive the command type and the callback function:

```js
const test = (name, fn) => {
  dispatch({ type: "ADD_TEST", fn, name });
};
```

We need to create a callback function called `state` globally to save the test. The callback function of the test is stored in an array.

```js
global["STATE_SYMBOL"] = {
  testBlock: [],
};
```

The `dispatch` method only needs to identify the corresponding commands at this time, and store the test callback function in the global `state`.

```js
const dispatch = (event) => {
  const { fn, type, name } = event;
  switch (type) {
    case "ADD_TEST":
      const { testBlock } = global["STATE_SYMBOL"];
      testBlock.push({ fn, name });
      break;
  }
};
```

## How to implement assertions and matchers

The assertion library is also very simple to implement. You only need to encapsulate a function to expose the matcher method to satisfy the following formula:

> `expect(A).toBe(B)`

Here we implement the commonly used method `toBe`, when the result is not equal to the expectation, just throw an error:

```js
const expect = (actual) => ({
    toBe(expected) {
        if (actual !== expected) {
            throw new Error(`${actual} is not equal to ${expected}`);
        }
    }
};
```

Actually, try/catch is used in the test block to catch errors and print stack information to locate the problem.

In simple cases, we can also use the `assert` module that comes with Node to make assertions. Of course, there are many more complex assertion methods, and the principles are similar in essence.

## CLI and configuration

After writing the test, we need to enter the command in the command line to run the single test. Normally, the command is similar to the following:

> `node jest xxx.spec.js`

The essence here is to parse the parameters of the command line.

```js
const testPath = process.argv.slice(2)[0];
const code = fs.readFileSync(path.join(process.cwd(), testPath)).toString();
```

In complex situations, you may also need to read the parameters of the local Jest configuration file to change the execution environment, etc. Here, Jest uses third-party libraries `yargs`, `execa` and `chalk`, etc. to parse, execute and print commands.

# Simulation

In complex test scenarios, we must not avoid a Jest term: mock (`mock`)

In the Jest documentation, we can find that Jest has the following description of simulation: "The simulation function erases the actual implementation of the function, captures the call to the function, and the parameters passed in these calls, so that the link between the test codes becomes easy"

In short, a simulation can be created by assigning the following code snippets to functions or dependencies:

```js
jest.mock("fs", {
  readFile: jest.fn(() => "wscats"),
});
```

This is a simple simulation example that simulates the return value of the readFile function of the fs module in testing specific business logic.

## How to simulate a function

Next, we will study how to implement it. The first is `jest.mock`. Its first parameter accepts the module name or module path, and the second parameter is the specific implementation of the module’s external exposure method.

```js
const jest = {
  mock(mockPath, mockExports = {}) {
    const path = require.resolve(mockPath, { paths: ["."] });
    require.cache[path] = {
      id: path,
      filename: path,
      loaded: true,
      exports: mockExports,
    };
  },
};
```

Our solution is actually the same as the implementation of the above `test` test block. You only need to find a place to save the specific implementation method, and replace it when the module is actually used later, so we save it in `require In .cache`, of course we can also store it in the global `state`.

The implementation of `jest.fn` is not difficult. Here we use a closure `mockFn` to store the replaced functions and parameters, which is convenient for subsequent test inspections and statistics of call data.

```js
const jest = {
  fn(impl = () => {}) {
    const mockFn = (...args) => {
      mockFn.mock.calls.push(args);
      return impl(...args);
    };
    mockFn.originImpl = impl;
    mockFn.mock = { calls: [] };
    return mockFn;
  },
};
```

# Execution environment

Some students may have noticed that in the testing framework, we don’t need to manually introduce the functions of `test`, `expect` and `jest`. Each test file can be used directly, so we need to create a run that injects these methods here. surroundings.

## V8 virtual machine and scope

Since everything is ready, we only need to inject the methods required for testing into the V8 virtual machine, that is, inject the testing scope.

```js
const context = {
  console: console.Console({ stdout: process.stdout, stderr: process.stderr }),
  jest,
  expect,
  require,
  test: (name, fn) => dispatch({ type: "ADD_TEST", fn, name }),
};
```

After injecting the scope, we can make the code of the test file run in the V8 virtual machine. The code I passed here is the code that has been processed into a string. Jest will do some code processing, security processing and SourceMap here. For sewing and other operations, our example does not need to be so complicated.

```js
vm.runInContext(code, context);
```

Before and after the code is executed, the time difference can be used to calculate the running time of a single test. Jest will also pre-evaluate the size and number of single test files here, and decide whether to enable Worker to optimize the execution speed.

```js
const start = new Date();
const end = new Date();
log("\x1b[32m%s\x1b[0m", `Time: ${end - start}ms`);
```

## Run single test callback

After the execution of the V8 virtual machine is completed, the global `state` will collect all the packaged test callback functions in the test block. Finally, we only need to traverse all these callback functions and execute them.

```js
testBlock.forEach(async (item) => {
  const { fn, name } = item;
  try {
    await fn.apply(this);
    log("\x1b[32m%s\x1b[0m", `√ ${name} passed`);
  } catch {
    log("\x1b[32m%s\x1b[0m", `× ${name} error`);
  }
});
```

## Hook function

We can also add life cycles to the single test execution process, such as hook functions such as `beforeEach`, `afterEach`, `afterAll` and `beforeAll`.

Adding the hook function to the above infrastructure is actually injecting the corresponding callback function in each process of executing the test. For example, `beforeEach` is placed before the traversal execution test function of `testBlock`, and `afterEach` is placed on `testBlock` After traversing the execution of the test function, it is very simple. You only need to put the right position to expose the hook function of any period.

```js
testBlock.forEach(async (item) => {
  const { fn, name } = item;
  beforeEachBlock.forEach(async (beforeEach) => await beforeEach());
  await fn.apply(this);
  afterEachBlock.forEach(async (afterEach) => await afterEach());
});
```

And `beforeAll` and `afterAll` can be placed before and after all tests of `testBlock` are completed.

```js
beforeAllBlock.forEach(async (beforeAll) => await beforeAll());
testBlock.forEach(async (item) => {}) +
  afterAllBlock.forEach(async (afterAll) => await afterAll());
```

At this point, we have implemented a simple test framework. Based on this, we can enrich the assertion method, matcher and support parameter configuration, and read the personal notes of the source code below.

# jest-cli

Download Jest source code and execute it in the root directory

```bash
yarn
npm run build
```

It essentially runs two files build.js and buildTs.js in the script folder:

```json
"scripts": {
    "build": "yarn build:js && yarn build:ts",
    "build:js": "node ./scripts/build.js",
    "build:ts": "node ./scripts/buildTs.js",
}
```

build.js essentially uses the babel library, create a new build folder in the package/xxx package, and then use transformFileSync to generate the file into the build folder:

```js
const transformed = babel.transformFileSync(file, options).code;
```

And buildTs.js essentially uses the tsc command to compile the ts file into the build folder, and use the execa library to execute the command:

```js
const args = ["tsc", "-b", ...packagesWithTs, ...process.argv.slice(2)];
await execa("yarn", args, { stdio: "inherit" });
```

![image](https://user-images.githubusercontent.com/17243165/115947329-84fe4380-a4f9-11eb-9df2-02cf8fdadd08.png)

Successful execution will display as follows, it will help you compile all files js files and ts files in the packages folder to the build folder of the directory where you are:

![image](https://user-images.githubusercontent.com/17243165/116343731-97d58880-a817-11eb-9507-96bae701e804.png)

Next we can start the jest command:

```bash
npm run jest
# Equivalent to
# node ./packages/jest-cli/bin/jest.js
```

Here you can do analysis processing according to the different parameters passed in, such as:

```bash
npm run jest -h
node ./packages/jest-cli/bin/jest.js /path/test.spec.js
```

It will execute the `jest.js` file, and then enter the run method in the `build/cli` file. The run method will parse various parameters in the command. The specific principle is that the yargs library cooperates with process.argv to achieve

```js
const importLocal = require("import-local");

if (!importLocal(__filename)) {
  if (process.env.NODE_ENV == null) {
    process.env.NODE_ENV = "test";
  }

  require("../build/cli").run();
}
```

# jest-config

When various command parameters are obtained, the core method of `runCLI` will be executed, which is the core method of the `@jest/core -> packages/jest-core/src/cli/index.ts` library.

```js
import { runCLI } from "@jest/core";
const outputStream = argv.json || argv.useStderr ? process.stderr : process.stdout;
const { results, globalConfig } = await runCLI(argv, projects);
```

The `runCLI` method will use the input parameter argv parsed in the command just now to read the configuration file information with the `readConfigs` method. `readConfigs` comes from `packages/jest-config/src/index.ts`, here There will be normalize to fill in and initialize some default configured parameters. Its default parameters are recorded in the `packages/jest-config/src/Defaults.ts` file. For example, if you only run js single test, the default setting of `require. resolve('jest-runner')` is a runner that runs a single test, and it also cooperates with the chalk library to generate an outputStream to output the content to the console.

By the way, let me mention the principle of introducing jest into the module. First, `require.resolve(moduleName)` will find the path of the module, and save the path in the configuration, and then use the tool library `packages/jest-util/src/requireOrImportModule The `requireOrImportModule` method of .ts` calls the encapsulated native `import/reqiure` method to match the path in the configuration file to take out the module.

- globalConfig configuration from argv
- configs are from the configuration of jest.config.js

```ts
const { globalConfig, configs, hasDeprecationWarnings } = await readConfigs(
  argv,
  projects
);

if (argv.debug) {
  /*code*/
}
if (argv.showConfig) {
  /*code*/
}
if (argv.clearCache) {
  /*code*/
}
if (argv.selectProjects) {
  /*code*/
}
```

# jest-haste-map

jest-haste-map is used to get all the files in the project and the dependencies between them. It achieves this by looking at the `import/require` calls, extracting them from each file and constructing a map containing each A file and its dependencies. Here Haste is the module system used by Facebook. It also has something called HasteContext, because it has HasteFS (Haste File System). HasteFS is just a list of files in the system and all dependencies associated with it. Item, it is a map data structure, where the key is the path and the value is the metadata. The `contexts` generated here will be used until the `onRunComplete` stage.

```ts
const { contexts, hasteMapInstances } = await buildContextsAndHasteMaps(
  configs,
  globalConfig,
  outputStream
);
```

# jest-runner

The `_run10000` method will obtain `contexts` according to the configuration information `globalConfig` and `configs`. `contexts` will store the configuration information and path of each local file, etc., and then will bring the callback function `onComplete`, the global configuration `globalConfig` and scope `contexts` enter the `runWithoutWatch` method.
![image](https://user-images.githubusercontent.com/17243165/117241252-51aaa580-ae65-11eb-9883-f60b70fa9fcc.png)

Next, you will enter the `runJest` method of the `packages/jest-core/src/runJest.ts` file, where the passed `contexts` will be used to traverse all unit tests and save them in an array.

```ts
let allTests: Array<Test> = [];
contexts.map(async (context, index) => {
  const searchSource = searchSources[index];
  const matches = await getTestPaths(
    globalConfig,
    searchSource,
    outputStream,
    changedFilesPromise && (await changedFilesPromise),
    jestHooks,
    filter
  );
  allTests = allTests.concat(matches.tests);
  return { context, matches };
});
```

And use the `Sequencer` method to sort the single tests

```ts
const Sequencer: typeof TestSequencer = await requireOrImportModule(
  globalConfig.testSequencer
);
const sequencer = new Sequencer();
allTests = await sequencer.sort(allTests);
```

The `runJest` method calls a key method `packages/jest-core/src/TestScheduler.ts`'s `scheduleTests` method.

```ts
const results = await new TestScheduler(
  globalConfig,
  { startRun },
  testSchedulerContext
).scheduleTests(allTests, testWatcher);
```

The `scheduleTests` method will do a lot of things, it will collect the `contexts` in the `allTests` into the `contexts`, collect the `duration` into the `timings` array, and subscribe to four life cycles before executing all single tests :

- test-file-start
- test-file-success
- test-file-failure
- test-case-result

Then traverse the `contexts` and use a new empty object `testRunners` to do some processing and save it, which will call the `createScriptTransformer` method provided by `@jest/transform` to process the imported modules.

```ts
import { createScriptTransformer } from "@jest/transform";

const transformer = await createScriptTransformer(config);
const Runner: typeof TestRunner = interopRequireDefault(
  transformer.requireAndTranspileModule(config.runner)
).default;
const runner = new Runner(this._globalConfig, {
  changedFiles: this._context?.changedFiles,
  sourcesRelatedToTestsInChangedFiles: this._context?.sourcesRelatedToTestsInChangedFiles,
});
testRunners[config.runner] = runner;
```

The `scheduleTests` method will call the `runTests` method of `packages/jest-runner/src/index.ts`.

```ts
async runTests(tests, watcher, onStart, onResult, onFailure, options) {
  return await (options.serial
    ? this._createInBandTestRun(tests, watcher, onStart, onResult, onFailure)
    : this._createParallelTestRun(
        tests,
        watcher,
        onStart,
        onResult,
        onFailure
      ));
}
```

In the final `_createParallelTestRun` or `_createInBandTestRun` method:

There will be a `runTestInWorker` method, which, as the name suggests, is to perform a single test in the worker.

![image](https://user-images.githubusercontent.com/17243165/117279102-f3e18200-ae93-11eb-9a1b-100197240ebe.png)

`_createInBandTestRun` will execute a core method `runTest` in `packages/jest-runner/src/runTest.ts`, and execute a method `runTestInternal` in `runJest`, which will prepare a lot of preparations before executing a single test The thing involves global method rewriting and hijacking of import and export methods.

```ts
await this.eventEmitter.emit("test-file-start", [test]);
return runTest(
  test.path,
  this._globalConfig,
  test.context.config,
  test.context.resolver,
  this._context,
  sendMessageToJest
);
```

In the `runTestInternal` method, the `fs` module will be used to read the content of the file and put it into `cacheFS`, which can be cached for quick reading later. For example, if the content of the file is json later, it can be read directly in `cacheFS`. Also use `Date.now` time difference to calculate time-consuming.

```ts
const testSource = fs().readFileSync(path, "utf8");
const cacheFS = new Map([[path, testSource]]);
```

In the `runTestInternal` method, `packages/jest-runtime/src/index.ts` will be introduced, which will help you cache and read modules and trigger execution.

```ts
const runtime = new Runtime(
  config,
  environment,
  resolver,
  transformer,
  cacheFS,
  {
    changedFiles: context?.changedFiles,
    collectCoverage: globalConfig.collectCoverage,
    collectCoverageFrom: globalConfig.collectCoverageFrom,
    collectCoverageOnlyFrom: globalConfig.collectCoverageOnlyFrom,
    coverageProvider: globalConfig.coverageProvider,
    sourcesRelatedToTestsInChangedFiles: context?.sourcesRelatedToTestsInChangedFiles,
  },
  path
);
```

Here, the `@jest/console` package is used to rewrite the global console. In order for the console of the single-tested file code block to print the results on the node terminal smoothly, in conjunction with the `jest-environment-node` package, set the global `environment.global` all Rewritten to facilitate subsequent methods to get these scopes in vm.

```ts
// Essentially it is rewritten using node's console to facilitate subsequent overwriting of the console method in the vm scope
testConsole = new BufferedConsole();
const environment = new TestEnvironment(config, {
  console: testConsole, // Suspected useless code
  docblockPragmas,
  testPath: path,
});
// Really rewrite the console method
setGlobal(environment.global, "console", testConsole);
```

`runtime` mainly uses these two methods to load the module, first judge whether it is an ESM module, if it is, use `runtime.unstable_importModule` to load the module and run the module, if not, use `runtime.requireModule` to load the module and run the module .

```ts
const esm = runtime.unstable_shouldLoadAsEsm(path);

if (esm) {
  await runtime.unstable_importModule(path);
} else {
  runtime.requireModule(path);
}
```

# jest-circus

Immediately after the `testFramework` in `runTestInternal` will accept the incoming runtime to call the single test file to run, the `testFramework` method comes from a library with an interesting name `packages/jest-circus/src/legacy-code-todo-rewrite /jestAdapter.ts`, where `legacy-code-todo-rewrite` means **legacy code todo rewrite**, `jest-circus` mainly rewrites some methods of global `global`, involving These few:

- afterAll
- afterEach
- beforeAll
- beforeEach
- describe
- it
- test

![image](https://user-images.githubusercontent.com/17243165/118916923-6bb6ae80-b962-11eb-8725-6c724e8b1952.png)

Before calling the single test here, the `jestAdapter` function, which is the above-mentioned `runtime.requireModule`, will load the `xxx.spec.js` file. The execution environment `globals` has been preset using `initialize` before execution. `And `snapshotState`, and rewrite `beforeEach`. If `resetModules`, `clearMocks`, `resetMocks`, `restoreMocks`and`setupFilesAfterEnv` are configured, the following methods will be executed respectively:

- runtime.resetModules
- runtime.clearAllMocks
- runtime.resetAllMocks
- runtime.restoreAllMocks
- runtime.requireModule or runtime.unstable_importModule

After running the initialization of the `initialize` method, because `initialize` has rewritten the global `describe` and `test` methods, these methods are all rewritten here in `/packages/jest-circus/src/index.ts`, here Note that there is a `dispatchSync` method in the `test` method. This is a key method. Here, a copy of `state` will be maintained globally. `dispatchSync` means to store the functions and other information in the `test` code block in the `state`, In `dispatchSync` uses `name` in conjunction with the `eventHandler` method to modify the `state`. This idea is very similar to the data flow in redux.

```ts
const test: Global.It = () => {
  return (test = (testName, fn, timeout) => (testName, mode, fn, testFn, timeout) => {
    return dispatchSync({
      asyncError,
      fn,
      mode,
      name: "add_test",
      testName,
      timeout,
    });
  });
};
```

The single test `xxx.spec.js`, that is, the testPath file will be imported and executed after the `initialize`. Note that this single test will be executed when imported here, because the single test `xxx.spec.js` file is written according to the specifications , There will be code blocks such as `test` and `describe`, so at this time all callback functions accepted by `test` and `describe` will be stored in the global `state`.

```ts
const esm = runtime.unstable_shouldLoadAsEsm(testPath);
if (esm) {
  await runtime.unstable_importModule(testPath);
} else {
  runtime.requireModule(testPath);
}
```

# jest-runtime

Here, it will first determine whether it is an esm module, if it is, use the method of `unstable_importModule` to import it, otherwise use the method of `requireModule` to import it, specifically will it enter the following function.

```ts
this._loadModule(localModule, from, moduleName, modulePath, options, moduleRegistry);
```

The logic of \_loadModule has only three main parts

- Judge whether it is a json suffix file, execute readFile to read the text, and use transformJson and JSON.parse to transform the output content.
- Determine whether the node suffix file is, and execute the require native method to import the module.
- For files that do not meet the above two conditions, execute the \_execModule execution module.

\_execModule will use babel to transform the source code read by fs. This `transformFile` is the `transform` method of `packages/jest-runtime/src/index.ts`.

```ts
const transformedCode = this.transformFile(filename, options);
```

![image](https://user-images.githubusercontent.com/17243165/119518220-ea6c7b00-bdaa-11eb-8723-d8bb89673acf.png)

\_execModule will use the `createScriptFromCode` method to call node's native vm module to actually execute js. The vm module accepts safe source code, and uses the V8 virtual machine with the incoming context to execute the code immediately or delay the execution of the code, here you can Accept different scopes to execute the same code to calculate different results, which is very suitable for the use of test frameworks. The injected vmContext here is the above global rewrite scope including afterAll, afterEach, beforeAll, beforeEach, describe, it, test, So our single test code will get these methods with injection scope when it runs.

```ts
const vm = require("vm");
const script = new vm().Script(scriptSourceCode, option);
const filename = module.filename;
const vmContext = this._environment.getVmContext();
script.runInContext(vmContext, {
  filename,
});
```

![image](https://user-images.githubusercontent.com/17243165/125756054-4c144a7a-447a-4b5b-973e-e3075b06daa0.png)

When the global method is overwritten and the `state` is saved above, it will enter the logic of the callback function that actually executes the `describe`, in the `run` method of `packages/jest-circus/src/run.ts`, here Use the `getState` method to take out the `describe` code block, then use the `_runTestsForDescribeBlock` to execute this function, then enter the `_runTest` method, and then use the hook function before and after the execution of `_callCircusHook`, and use the `_callCircusTest` to execute.

```ts
const run = async (): Promise<Circus.RunResult> => {
  const { rootDescribeBlock } = getState();
  await dispatch({ name: "run_start" });
  await _runTestsForDescribeBlock(rootDescribeBlock);
  await dispatch({ name: "run_finish" });
  return makeRunResult(getState().rootDescribeBlock, getState().unhandledErrors);
};

const _runTest = async (test, parentSkipped) => {
  // beforeEach
  // test function block, testContext scope
  await _callCircusTest(test, testContext);
  // afterEach
};
```

This is the core position of the hook function implementation and also the core element of the Jest function.

# At last

I hope this article can help you understand the core implementation and principles of the Jest testing framework. Thank you for reading patiently. If the articles and notes can bring you a hint of help or inspiration, please don’t be stingy with your Star and Fork. The articles are continuously updated synchronously, your affirmation Is my biggest motivation to move forward😁
