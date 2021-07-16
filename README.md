[English](https://github.com/Wscats/jest-tutorial/blob/vm/README.EN.md) | [中文](https://github.com/Wscats/jest-tutorial/blob/vm/README.md)

# 深入浅出 Jest 框架的实现原理

# 什么是 Jest

Jest 是 Facebook 开发的 Javascript 测试框架，用于创建、运行和编写测试的 JavaScript 库。

Jest 作为 NPM 包发布，可以安装并运行在任何 JavaScript 项目中。Jest 是目前前端最流行的测试库之一。

# 测试意味着什么

在技 ​​ 术术语中，测试意味着检查我们的代码是否满足某些期望。例如：一个名为求和(`sum`)函数应该返回给定一些运算结果的预期输出。

有许多类型的测试，很快你就会被术语淹没，但长话短说的测试分为三大类：

- 单元测试
- 集成测试
- E2E 测试

# 我怎么知道要测试什么

在测试方面，即使是最简单的代码块也可能使初学者也可能会迷惑。最常见的问题是“我怎么知道要测试什么？”。

如果您正在编写网页，一个好的出发点是测试应用程序的每个页面和每个用户交互。但是网页其实也需要测试的函数和模块等代码单元组成。

大多数时候有两种情况：

- 你继承遗留代码，其自带没有测试
- 你必须凭空实现一个新功能

那该怎么办？对于这两种情况，你可以通过将测试视为：检查该函数是否产生预期结果。最典型的测试流程如下所示：

- 导入要测试的函数
- 给函数一个输入
- 定义期望的输出
- 检查函数是否产生预期的输出

一般，就这么简单。掌握以下核心思路，编写测试将不再可怕：

> 输入 -> 预期输出 -> 断言结果。

# 测试块，断言和匹配器

我们将创建一个简单的 Javascript 函数代码，用于 2 个数字的加法，并为其编写相应的基于 Jest 的测试

```js
const sum = (a, b) => a + b;
```

现在，为了测试在同一个文件夹中创建一个测试文件，命名为 `test.spec.js`，这特殊的后缀是 Jest 的约定，用于查找所有的测试文件。我们还将导入被测函数，以便执行测试中的代码。Jest 测试遵循 BDD 风格的测试，每个测试都应该有一个主要的 `test` 测试块，并且可以有多个测试块，现在可以为 `sum` 方法编写测试块，这里我们编写一个测试来添加 2 个数字并验证预期结果。我们将提供数字为 1 和 2，并期望输出 3。

`test` 它需要两个参数：一个用于描述测试块的字符串，以及一个用于包装实际测试的回调函数。`expect` 包装目标函数，并结合匹配器 `toBe` 用于检查函数计算结果是否符合预期。

这是完整的测试：

```js
test("sum test", () => {
  expect(sum(1, 2)).toBe(3);
});
```

我们观察上面代码有发现有两点：

- `test` 块是单独的测试块，它拥有描述和划分范围的作用，即它代表我们要为该计算函数 `sum` 所编写测试的通用容器。
- `expect` 是一个断言，该语句使用输入 1 和 2 调用被测函数中的 `sum` 方法，并期望输出 3。
- `toBe` 是一个匹配器，用于检查期望值，如果不符合预期结果则应该抛出异常。

## 如何实现测试块

测试块其实并不复杂，最简单的实现不过如下，我们需要把测试包装实际测试的回调函数存起来，所以封装一个 `dispatch` 方法接收命令类型和回调函数：

```js
const test = (name, fn) => {
  dispatch({ type: "ADD_TEST", fn, name });
};
```

我们需要在全局创建一个 `state` 保存测试的回调函数，测试的回调函数使用一个数组存起来。

```js
global["STATE_SYMBOL"] = {
  testBlock: [],
};
```

`dispatch` 方法此时只需要甄别对应的命令，并把测试的回调函数存进全局的 `state` 即可。

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

## 如何实现断言和匹配器

断言库也实现也很简单，只需要封装一个函数暴露匹配器方法满足以下公式即可：

> `expect(A).toBe(B)`

这里我们实现 `toBe` 这个常用的方法，当结果和预期不相等，抛出错误即可：

```js
const expect = (actual) => ({
    toBe(expected) {
        if (actual !== expected) {
            throw new Error(`${actual} is not equal to ${expected}`);
        }
    }
};
```

实际在测试块中会使用 `try/catch` 捕获错误，并打印堆栈信息方面定位问题。

在简单情况下，我们也可以使用 Node 自带的 `assert` 模块进行断言，当然还有很多更复杂的断言方法，本质上原理都差不多。

## CLI 和配置

编写完测试之后，我们则需要在命令行中输入命令运行单测，正常情况下，命令类似如下：

> `node jest xxx.spec.js`

这里本质是解析命令行的参数。

```js
const testPath = process.argv.slice(2)[0];
const code = fs.readFileSync(path.join(process.cwd(), testPath)).toString();
```

复杂的情况可能还需要读取本地的 Jest 配置文件的参数来更改执行环境等，Jest 在这里使用了第三方库 `yargs` `execa` 和 `chalk` 等来解析执行并打印命令。

# 模拟

在复杂的测试场景，我们一定绕不开一个 Jest 术语：模拟(`mock`)

在 Jest 文档中，我们可以找到 Jest 对模拟有以下描述：”模拟函数通过抹去函数的实际实现、捕获对函数的调用，以及在这些调用中传递的参数，使测试代码之间的链接变得容易“

简而言之，可以通过将以下代码片段分配给函数或依赖项来创建模拟：

```js
jest.mock("fs", {
  readFile: jest.fn(() => "wscats"),
});
```

这是一个简单模拟的示例，模拟了 fs 模块 readFile 函数在测试特定业务逻辑的返回值。

## 怎么模拟一个函数

接下来我们就要研究一下如何实现，首先是 `jest.mock`，它第一个参数接受的是模块名或者模块路径，第二个参数是该模块对外暴露方法的具体实现

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

我们方案其实跟上面的 `test` 测试块实现一致，只需要把具体的实现方法找一个地方存起来即可，等后续真正使用改模块的时候替换掉即可，所以我们把它存到 `require.cache` 里面，当然我们也可以存到全局的 `state` 中。

而 `jest.fn` 的实现也不难，这里我们使用一个闭包 `mockFn` 把替换的函数和参数给存起来，方便后续测试检查和统计调用数据。

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

# 执行环境

有些同学可能留意到了，在测试框架中，我们并不需要手动引入 `test`、`expect` 和 `jest` 这些函数，每个测试文件可以直接使用，所以我们这里需要创造一个注入这些方法的运行环境。

## V8 虚拟机和作用域

既然万事俱备只欠东风，我们只需要给 V8 虚拟机注入测试所需的方法，即注入测试作用域即可。

```js
const context = {
  console: console.Console({ stdout: process.stdout, stderr: process.stderr }),
  jest,
  expect,
  require,
  test: (name, fn) => dispatch({ type: "ADD_TEST", fn, name }),
};
```

注入完作用域，我们就可以让测试文件的代码在 V8 虚拟机中跑起来，这里我传入的代码是已经处理成字符串的代码，Jest 这里会在这里做一些代码加工，安全处理和 SourceMap 缝补等操作，我们示例就不需要搞那么复杂了。

```js
vm.runInContext(code, context);
```

在代码执行的前后可以使用时间差算出单测的运行时间，Jest 还会在这里预评估单测文件的大小数量等，决定是否启用 Worker 来优化执行速度

```js
const start = new Date();
const end = new Date();
log("\x1b[32m%s\x1b[0m", `Time: ${end - start}ms`);
```

## 运行单测回调

V8 虚拟机执行完毕之后，全局的 `state` 就会收集到测试块中所有包装好的测试回调函数，我们最后只需要把所有的这些回调函数遍历取出来，并执行。

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

## 钩子函数

我们还可以在单测执行过程中加入生命周期，例如 `beforeEach`，`afterEach`，`afterAll` 和 `beforeAll` 等钩子函数。

在上面的基础架构上增加钩子函数，其实就是在执行 test 的每个过程中注入对应回调函数，比如 `beforeEach` 就是放在 `testBlock` 遍历执行测试函数前，`afterEach` 就是放在 `testBlock` 遍历执行测试函数后，非常的简单，只需要位置放对就可以暴露任何时期的钩子函数。

```js
testBlock.forEach(async (item) => {
  const { fn, name } = item;
  +beforeEachBlock.forEach(async (beforeEach) => await beforeEach());
  await fn.apply(this);
  +afterEachBlock.forEach(async (afterEach) => await afterEach());
});
```

而 `beforeAll` 和 `afterAll` 就可以放在，`testBlock` 所有测试运行完毕前和后。

```js
+beforeAllBlock.forEach(async (beforeAll) => await beforeAll());
testBlock.forEach(async (item) => {}) +
  afterAllBlock.forEach(async (afterAll) => await afterAll());
```

至此，我们就实现了一个简单的测试框架了，我们可以在此基础上，丰富断言方法，匹配器和支持参数配置，下面附读源码的个人笔记。

# jest-cli

下载 Jest 源码，根目录下执行

```bash
yarn
npm run build
```

它本质跑的是 script 文件夹的两个文件 build.js 和 buildTs.js:

```json
"scripts": {
    "build": "yarn build:js && yarn build:ts",
    "build:js": "node ./scripts/build.js",
    "build:ts": "node ./scripts/buildTs.js",
}
```

build.js 本质上是使用了 babel 库，在 package/xxx 包新建一个 build 文件夹，然后使用 transformFileSync 把文件生成到 build 文件夹里面:

```js
const transformed = babel.transformFileSync(file, options).code;
```

而 buildTs.js 本质上是使用了 tsc 命令，把 ts 文件编译到 build 文件夹中，使用 execa 库来执行命令:

```js
const args = ["tsc", "-b", ...packagesWithTs, ...process.argv.slice(2)];
await execa("yarn", args, { stdio: "inherit" });
```

![image](https://user-images.githubusercontent.com/17243165/115947329-84fe4380-a4f9-11eb-9df2-02cf8fdadd08.png)

执行成功会显示如下，它会帮你把 packages 文件夹下的所有文件 js 文件和 ts 文件编译到所在目录的 build 文件夹下:

![image](https://user-images.githubusercontent.com/17243165/116343731-97d58880-a817-11eb-9507-96bae701e804.png)

接下来我们可以启动 jest 的命令：

```bash
npm run jest
# 等价于
# node ./packages/jest-cli/bin/jest.js
```

这里可以根据传入的不同参数做解析处理，比如：

```bash
npm run jest -h
node ./packages/jest-cli/bin/jest.js /path/test.spec.js
```

就会执行 `jest.js` 文件，然后进入到 `build/cli` 文件中的 run 方法，run 方法会对命令中各种的参数做解析，具体原理是 yargs 库配合 process.argv 实现

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

当获取各种命令参数后，就会执行 `runCLI` 核心的方法，它是 `@jest/core -> packages/jest-core/src/cli/index.ts` 库的核心方法。

```js
import { runCLI } from "@jest/core";
const outputStream = argv.json || argv.useStderr ? process.stderr : process.stdout;
const { results, globalConfig } = await runCLI(argv, projects);
```

`runCLI` 方法中会使用刚才命令中解析好的传入参数 argv 来配合 `readConfigs` 方法读取配置文件的信息，`readConfigs` 来自于 `packages/jest-config/src/index.ts`，这里会有 normalize 填补和初始化一些默认配置好的参数，它的默认参数在 `packages/jest-config/src/Defaults.ts` 文件中记录，比如：如果只运行 js 单测，会默认设置 `require.resolve('jest-runner')` 为运行单测的 runner，还会配合 chalk 库生成 outputStream 输出内容到控制台。

这里顺便提一下引入 jest 引入模块的原理思路，这里先会 `require.resolve(moduleName)` 找到模块的路径，并把路径存到配置里面，然后使用工具库 `packages/jest-util/src/requireOrImportModule.ts` 的 `requireOrImportModule` 方法调用封装好的原生 `import/reqiure` 方法配合配置文件中的路径把模块取出来。

- globalConfig 来自于 argv 的配置
- configs 来自于 jest.config.js 的配置

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

jest-haste-map 用于获取项目中的所有文件以及它们之间的依赖关系，它通过查看 `import/require` 调用来实现这一点，从每个文件中提取它们并构建一个映射，其中包含每个文件及其依赖项，这里的 Haste 是 Facebook 使用的模块系统，它还有一个叫做 HasteContext 的东西，因为它有 HastFS（Haste 文件系统），HastFS 只是系统中文件的列表以及与之关联的所有依赖项，它是一种地图数据结构，其中键是路径，值是元数据，这里生成的 `contexts` 会一直被沿用到 `onRunComplete` 阶段。

```ts
const { contexts, hasteMapInstances } = await buildContextsAndHasteMaps(
  configs,
  globalConfig,
  outputStream
);
```

# jest-runner

`_run10000` 方法中会根据配置信息 `globalConfig` 和 `configs` 获取 `contexts`，`contexts` 会存储着每个局部文件的配置信息和路径等，然后会带着回调函数 `onComplete`，全局配置 `globalConfig` 和作用域 `contexts` 进入 `runWithoutWatch` 方法。
![image](https://user-images.githubusercontent.com/17243165/117241252-51aaa580-ae65-11eb-9883-f60b70fa9fcc.png)

接下来会进入 `packages/jest-core/src/runJest.ts` 文件的 `runJest` 方法中，这里会使用传过来的 `contexts` 遍历出所有的单元测试并用数组保存起来。

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

并使用 `Sequencer` 方法对单测进行排序

```ts
const Sequencer: typeof TestSequencer = await requireOrImportModule(
  globalConfig.testSequencer
);
const sequencer = new Sequencer();
allTests = await sequencer.sort(allTests);
```

`runJest` 方法会调用一个关键的方法 `packages/jest-core/src/TestScheduler.ts` 的 `scheduleTests` 方法。

```ts
const results = await new TestScheduler(
  globalConfig,
  { startRun },
  testSchedulerContext
).scheduleTests(allTests, testWatcher);
```

`scheduleTests` 方法会做很多事情，会把 `allTests` 中的 `contexts` 收集到 `contexts` 中，把 `duration` 收集到 `timings` 数组中，并在执行所有单测前订阅四个生命周期：

- test-file-start
- test-file-success
- test-file-failure
- test-case-result

接着把 `contexts` 遍历并用一个新的空对象 `testRunners` 做一些处理存起来，里面会调用 `@jest/transform` 提供的 `createScriptTransformer` 方法来处理引入的模块。

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

而 `scheduleTests` 方法会调用 `packages/jest-runner/src/index.ts` 的 `runTests` 方法。

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

最终 `_createParallelTestRun` 或者 `_createInBandTestRun` 方法里面：

- `_createParallelTestRun`

里面会有一个 `runTestInWorker` 方法，这个方法顾名思义就是在 worker 里面执行单测。

![image](https://user-images.githubusercontent.com/17243165/117279102-f3e18200-ae93-11eb-9a1b-100197240ebe.png)

- `_createInBandTestRun` 里面会执行 `packages/jest-runner/src/runTest.ts` 一个核心方法 `runTest`，而 `runJest` 里面就执行一个方法 `runTestInternal`，这里面会在执行单测前准备非常多的东西，涉及全局方法改写和引入和导出方法的劫持。

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

在 `runTestInternal` 方法中会使用 `fs` 模块读取文件的内容放入 `cacheFS`，缓存起来方便以后快读读取，比如后面如果文件的内容是 json 就可以直接在 `cacheFS` 读取，也会使用 `Date.now` 时间差计算耗时。

```ts
const testSource = fs().readFileSync(path, "utf8");
const cacheFS = new Map([[path, testSource]]);
```

在 `runTestInternal` 方法中会引入 `packages/jest-runtime/src/index.ts`，它会帮你缓存模块和读取模块并触发执行。

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

# jest-environment-node

这里使用 `@jest/console` 包改写全局的 console，为了单测的文件代码块的 console 能顺利在 node 终端打印结果，配合 `jest-environment-node` 包，把全局的 `environment.global` 全部改写，方便后续在 vm 中能得到这些作用域的方法，本质上就是为 vm 的运行环境提供的作用域，为后续注入 `global` 提供便利，涉及到改写的 `global` 方法有如下：

- global.global
- global.clearInterval
- global.clearTimeout
- global.setInterval
- global.setTimeout
- global.Buffer
- global.setImmediate
- global.clearImmediate
- global.Uint8Array
- global.TextEncoder
- global.TextDecoder
- global.queueMicrotask
- global.AbortController

```ts
// 本质上是使用 node 的 console 改写，方便后续覆盖 vm 作用域里面的 console 方法
testConsole = new BufferedConsole();
const environment = new TestEnvironment(config, {
  console: testConsole, // 疑似无用的代码
  docblockPragmas,
  testPath: path,
});
// 真正改写 console 的方法
setGlobal(environment.global, "console", testConsole);
```

`runtime` 主要用这两个方法加载模块，先判断是否 ESM 模块，如果是，使用 `runtime.unstable_importModule` 加载模块并运行该模块，如果不是，则使用 `runtime.requireModule` 加载模块并运行该模块。

```ts
const esm = runtime.unstable_shouldLoadAsEsm(path);

if (esm) {
  await runtime.unstable_importModule(path);
} else {
  runtime.requireModule(path);
}
```

# jest-circus

紧接着 `runTestInternal` 中的 `testFramework` 会接受传入的 runtime 调用单测文件运行，`testFramework` 方法来自于一个名字比较有意思的库 `packages/jest-circus/src/legacy-code-todo-rewrite/jestAdapter.ts`，其中 `legacy-code-todo-rewrite` 意思为**遗留代码待办事项重写**，`jest-circus` 主要会把全局 `global` 的一些方法进行重写，涉及这几个：

- afterAll
- afterEach
- beforeAll
- beforeEach
- describe
- it
- test

![image](https://user-images.githubusercontent.com/17243165/118916923-6bb6ae80-b962-11eb-8725-6c724e8b1952.png)

这里调用单测前会在 `jestAdapter` 函数中，也就是上面提到的 `runtime.requireModule` 加载 `xxx.spec.js` 文件，这里执行之前已经使用 `initialize` 预设好了执行环境 `globals` 和 `snapshotState`，并改写 `beforeEach`，如果配置了 `resetModules`，`clearMocks`，`resetMocks`，`restoreMocks` 和 `setupFilesAfterEnv` 则会分别执行下面几个方法：

- runtime.resetModules
- runtime.clearAllMocks
- runtime.resetAllMocks
- runtime.restoreAllMocks
- runtime.requireModule 或者 runtime.unstable_importModule

当运行完 `initialize` 方法初始化之后，由于 `initialize` 改写了全局的 `describe` 和 `test` 等方法，这些方法都在 `/packages/jest-circus/src/index.ts` 这里改写，这里注意 `test` 方法里面有一个 `dispatchSync` 方法，这是一个关键的方法，这里会在全局维护一份 `state`，`dispatchSync` 就是把 `test` 代码块里面的函数等信息存到 `state` 里面，`dispatchSync` 里面使用 `name` 配合 `eventHandler` 方法来修改 `state`，这个思路非常像 redux 里面的数据流。

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

而单测 `xxx.spec.js` 即 testPath 文件会在 `initialize` 之后会被引入并执行，注意这里引入就会执行这个单测，由于单测 `xxx.spec.js` 文件里面按规范写，会有 `test` 和 `describe` 等代码块，所以这个时候所有的 `test` 和 `describe` 接受的回调函数都会被存到全局的 `state` 里面。

```ts
const esm = runtime.unstable_shouldLoadAsEsm(testPath);
if (esm) {
  await runtime.unstable_importModule(testPath);
} else {
  runtime.requireModule(testPath);
}
```

# jest-runtime

这里的会先判断是否 esm 模块，如果是则使用 `unstable_importModule` 的方式引入，否则使用 `requireModule` 的方式引入，具体会进入下面吗这个函数。

```ts
this._loadModule(localModule, from, moduleName, modulePath, options, moduleRegistry);
```

\_loadModule 的逻辑只有三个主要部分

- 判断是否 json 后缀文件，执行 readFile 读取文本，用 transformJson 和 JSON.parse 转格输出内容。
- 判断是否 node 后缀文件，执行 require 原生方法引入模块。
- 不满足上述两个条件的文件，执行 \_execModule 执行模块。

\_execModule 中会使用 babel 来转化 fs 读取到的源代码，这个 `transformFile` 就是 `packages/jest-runtime/src/index.ts` 的 `transform` 方法。

```ts
const transformedCode = this.transformFile(filename, options);
```

![image](https://user-images.githubusercontent.com/17243165/119518220-ea6c7b00-bdaa-11eb-8723-d8bb89673acf.png)

\_execModule 中会使用 `createScriptFromCode` 方法调用 node 的原生 vm 模块来真正的执行 js，vm 模块接受安全的源代码，并用 V8 虚拟机配合传入的上下文来立即执行代码或者延时执行代码，这里可以接受不同的作用域来执行同一份代码来运算出不同的结果，非常合适测试框架的使用，这里的注入的 vmContext 就是上面全局改写作用域包含 afterAll，afterEach，beforeAll，beforeEach，describe，it，test，所以我们的单测代码在运行的时候就会得到拥有注入作用域的这些方法。

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

当上面复写全局方法和保存好 `state` 之后，会进入到真正执行 `describe` 的回调函数的逻辑里面，在 `packages/jest-circus/src/run.ts` 的 `run` 方法里面，这里使用 `getState` 方法把 `describe` 代码块取出来，然后使用 `_runTestsForDescribeBlock` 执行这个函数，然后进入到 `_runTest` 方法，然后使用 `_callCircusHook` 执行前后的钩子函数，使用 `_callCircusTest` 执行。

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
  // test 函数块，testContext 作用域
  await _callCircusTest(test, testContext);
  // afterEach
};
```

这是钩子函数实现的核心位置，也是 Jest 功能的核心要素。

# 最后

希望本文能够帮助大家理解 Jest 测试框架的核心实现和原理，感谢大家耐心的阅读，如果文章和笔记能带您一丝帮助或者启发，请不要吝啬你的 Star 和 Fork，文章同步持续更新，你的肯定是我前进的最大动力 😁
