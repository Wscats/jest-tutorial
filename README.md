# 深入浅出前端单元测试框架的实现原理

## 前言

在本文开始之前，先说一下笔者对于单元测试（或集成测试、e2e 测试）的感受。

在国外，软件工程师们对于软件质量十分重视，大部分也都崇尚于使用 TDD 方式开发，保证代码质量。而国内往往不是十分重视自动化测试这方面。究其根本来说，国内确实存在不少原因导致自动化测试不流行。这里就不赘述了。

但是其实在中大型软件开发中，自动化测试其实十分重要。笔者认为，在现代软件开发中，完善的自动化测试和 Lint 工具、良好代码设计，基本可以保证软件长期保持稳定的生命力。

因此，笔者相信，即使不是现在，在未来，自动化测试也是工程师必备的一项技能（快乐下班的技能哈哈哈）。

## 关于单元测试

先看维基百科：

> 在计算机编程中，单元测试（英语：Unit Testing）又称为模块测试，是针对程序模块（软件设计的最小单位）来进行正确性检验的测试工作。程序单元是应用的最小可测试部件。在过程化编程中，一个单元就是单个程序、函数、过程等；对于面向对象编程，最小单元就是方法，包括基类（超类）、抽象类、或者派生类（子类）中的方法。

在前端背景下，这个也可以很简单理解为测试工具函数。通常来说，单元测试，关于验证我们应用中每一个函数是否调用正确。如何判断调用正确呢？考虑一般如下：

- 函数调用次数合理
- 函数入参符合预期
- 函数出参，也即是返回值符合预期

当然函数本身可能又会调用其他函数，或者也可以说函数会依赖其他模块、第三方库，同时函数也可能是同步或异步。所以当被测试的函数是纯函数时，就是测试函数本身的出入参是否符合预期就行了，否则，我们需要做许多 mock 的工作，借此来排除不是我们目标的测试代码。

当然我们日常工作中，如果要写单元测试的话，一般都会使用业界成熟的测试库，比如 jest、mocha、chai、ava、tape、QUnit 等等。其实大部分测试框架背后的原理基本类似。所以，让我们通过实现一个最简单的单元测试框架，来学习单元测试原理吧！

## 测试容器和断言库

测试框架基本可以拆分出两个部分：

- 测试容器（Test Runner）
- 断言库（Assertion Library）

### 简介

测试容器最基本的作用是，自动运行所有测试，对测试结果进行数据汇总等。我们常见的使用方式一般如下，编写测试单元：

```js
// ./math.test.js
const { sumAsync, subtractAsync } = require('./math');

test('sumAsync adds numbers asynchronously', async () => {
  const result = await sumAsync(3, 7);
  const expected = 10;
  expect(result).toBe(expected);
});

test('subtractAsync subtracts numbers asynchronously', async () => {
  const result = await subtractAsync(7, 3);
  const expected = 4;
  expect(result).toBe(expected);
});
```

假设我们有 math 工具函数如下：

```js
// ./math.js
const sum = (a, b) => a + b;
const subtract = (a, b) => a - b;
const sumAsync = (...args) => Promise.resolve(sum(...args));
const subtractAsync = (...args) => Promise.resolve(subtract(...args));

module.exports = { sum, subtract, sumAsync, subtractAsync };
```

我们用 jest 运行测试，在终端反馈汇总后的测试结果：

```bash
$ jest
 PASS  ./math.test.js
  ✓ sumAsync adds numbers asynchronously (4ms)
  ✓ subtractAsync subtracts numbers asynchronously (1ms)

Test Suites: 1 passed, 1 total
Tests:       2 passed, 2 total
Snapshots:   0 total
Time:        1.145s
Ran all test suites.
```

断言库一般形式如下：

```js
expect(result).toBe(expected);
expect(func).toHaveBeenCalled();
expect(func).toHaveBeenCalledTimes(1);
expect(func).toHaveBeenCalledWith(arg1, arg2 /* ...args  */);
// ...
```

断言库是不是看起来很语义化~

### 测试容器实现示例

测试容器其实并不复杂，最简单的实现不过如下：

```js
// ./test.js
async function test(title, callback) {
  try {
    await callback();
    console.log(`✓ ${title}`);
  } catch (error) {
    console.error(`✕ ${title}`);
    console.error(error);
  }
}
```

需要留意的是，这里加上了 async/await 是为了等待测试用例中的异步逻辑。

### 断言库实现示例

断言库也没有黑魔法，我们写一个最简单的 expect(x).toBe(y) 的语法如下：

```js
// ./expect.js
function expect(actual) {
  return {
    toBe(expected) {
      if (actual !== expected) {
        throw new Error(`${actual} is not equal to ${expected}`);
      }
    },
  };
}
```

远比想象中简单，对不对~

这里有个比较关键的地方是，断言函数里如果断言失败时，我们的选择是抛出一个错误，然后在测试容器中会 try/catch 捕获，同时打印错误堆栈。（在简单情况下，我们也可以使用 Node.js 自带的 assert 库进行断言）

除此之外，还有很多更复杂的断言语法，不过基本形式也就是这样。当然如何巧妙设计测试函数调用次数（toHaveBeenCalledTimes）、出入参（toHaveBeenCalledWith）的断言函数，后文会提到。

### 自动注入

有些同学可能留意到了，在测试框架中，我们并不需要手动引入 test、expect 这些函数，每个测试文件可以直接使用。这个其实也很简单。参考代码如下：

```js
// ./test-framework.js
// 注入给全局对象，使得每个文件可以访问
global.test = require('./test');
global.expect = require('./expect');

// 从命令行加载所有测试用例：
process.argv.slice(2).forEach(file => {
  // 测试文件中
  require(file);
});
```

然后在终端运行：

```bash
$ node test-framework.js ./math.test.js
✓ sumAsync adds numbers asynchronously
✓ subtractAsync subtracts numbers asynchronously
```

对不对！就是这么简单！

接下来我们只需要把这件事情做得更优雅，比如

- 把它封装成 TestRunner 对象
- 把命令放在 ./bin 中
- 扩展更多的断言语法
- 使用 glob 匹配所有测试文件
- 支持配置（参考 jest.config.js）
- 测试汇总统计
- 支持优雅的错误堆栈

甚至于你可以扩展进行支持 DOM 测试，因为 DOM 测试的核心逻辑也是使用 JSDOM 根据 W3C 标准在内存中模拟相似的 DOM 结构，从而支持断言测试的。

## 函数测试

上文中我们基本搭建了一个最简单的测试框架，文件结构如下：

```
.
├── expect.js
├── math.js
├── math.test.js
├── test-framework.js
└── test.js
```

说起来，在某些场景下，其实我们需要能够保证函数只被执行一次，以及被调用时候的入参是准确的。

因为函数调用多次可能会引发内存泄露，入参错误则可能会导致应用不可预期的行为。所以我们需要从断言库中更细粒度的去测试保障。

那么断言库是怎么做到的呢？

接下来我们将扩展一下断言库，使其支持更丰富的函数测试。

### 入参与调用次数监控的实现原理

假设我们扩展支持这两种断言语法：

```js
expect(sum).toHaveBeenCalledTimes(1);
expect(sum).toHaveBeenCalledWith(3, 7);
```

大家可以思考一下如何设计实现呢？

我们在测试框架中，集成下面这个函数：

```js
// ./test-framework.js
global.jest = {
  fn: (impl = () => {}) => {
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

其中的 fn 函数是一个高阶函数，包裹传入的待测试函数 impl。挂载 mock 对象，在返回的 mockFn 中调用时，用以统计调用数据。

当然对于编写测试用例的调用方来说是无需感知的，只需要使用 jest.fn 进行包裹即可：

```js
const sumMockFn = jest.fn(sum);
```

接下来只需要对返回的 sumMockFn 进行测试即可，本质上对 sumMockFn 的操作，都会透传到 sum 中。

### 扩展断言函数

所以我们还差什么？... 嗯对了。还有断言函数：

```js
// ./expect
const { isEqual } = require('lodash');

module.exports = function expect(actual) {
  return {
    toBe(expected) {
      // ...
    },
    toEqual(expected) {
      if (!isEqual(actual, expected)) {
        throw new Error(`${actual} is not equal to ${expected}`);
      }
    },
    toHaveBeenCalledTimes(expected) {
      let actualCallTimes = 0;
      try {
        actualCallTimes = actual.mock.calls.length;
        expect(actualCallTimes).toEqual(expected);
      } catch (err) {
        throw new Error(
          `expect function: ${actual.originImpl.toString()} to call ${expected} times, but actually call ${actualCallTimes} times`
        );
      }
    },
    toHaveBeenCalledWith(...expectedArgs) {
      let actualCallArgs = [];
      try {
        actualCallArgs = actual.mock.calls;
        actualCallArgs.forEach(callArgs => {
          expect(callArgs).toEqual(expectedArgs);
        });
      } catch (err) {
        throw new Error(
          `expect function: ${actual.originImpl.toString()} to be called with ${expectedArgs}, but actually it was called with ${actualCallArgs}`
        );
      }
    },
  };
};
```

别看代码有点长，其实细看很简单对不对。关键点就是对 jest.fn 包裹过后的函数挂载的对象 mock 长度、内容进行断言。这里需要留意的是。我们捕获了 `expect(x).toEqual(y)` 抛出的错误，抛出了一个对用户更友好的错误。

终于，我们编写测试用例如下：

```js
test('sum should have been called once', () => {
  const sumMockFn = jest.fn(sum);
  sumMockFn(3, 7);
  expect(sumMockFn).toHaveBeenCalledTimes(1);
});

test('sum should have been called with `3` `7`', () => {
  const sumMockFn = jest.fn(sum);
  sumMockFn(3, 7);
  expect(sum).toHaveBeenCalledWith(3, 7);
});
```

成功运行！

```bash
$ node test-framework.js ./math.test.js
✓ sum should have been called once
✓ sum should have been called with `3` `7`
```

## 模块

经过我们的努力。我们已经做了一个像模像样的测试框架了。但是请等等！现实真的有这么简单么？

突然需要测试一个新的函数，这个函数好像有点不一样...

```js
// ./user.js
const { v4: uuidv4 } = require('uuid');

module.exports = {
  createUser({ name, age }) {
    return {
      id: uuidv4(),
      name,
      age,
    };
  },
};
```

我们想要测试这个函数返回带有一个 id 的用户对象，同时也调用了 uuidv4。但是发现这个函数没办法编写测试，因为每次生成的 id 不一样，所以它每次返回对象都不一样。没办法简单的使用 `expect(x).toEqual(y)`。

但是我们不可能去测试 uuid 库。因为测试它们是毫无意义的，也是不现实的。

那怎么办呢？我们还是有办法的。扩展测试框架如下：

```js
// ./test-framework.js
global.jest = {
  fn: (impl = () => {}) => {
    // ...
  },
  mock: (mockPath, mockExprts = {}) => {
    const path = require.resolve(mockPath);

    require.cache[path] = {
      id: path,
      filename: path,
      loaded: true,
      exports: mockExprts,
    };
  },
};
// ...
```

我们发现上面的 mock 函数使用 require.resolve 获取了模块加载路径，然后在 require.cache 准备好构造后的缓存导出对象。

编写测试如下：

```js
// ./user.test.js
jest.mock('uuid', {
  v4: () => 'FAKE_ID',
});

const { createUser } = require('./user');

test('create an user with id', () => {
  const userData = {
    name: 'Christina',
    age: 25,
  };
  const expectUser = {
    ...userData,
    id: 'FAKE_ID',
  };

  expect(createUser(userData)).toEqual(expectUser);
});
```

因为 require.cache 的关系，我们需要把 jest.mock 提到文件最前面调用。（jest 里同样的操作不需要提前，那是因为测试框架在运行测试用例时自动提前此类操作了）然后模拟导出的 v4 对象返回一个 FAKE_ID。

运行测试如下：

```bash
$ node test-framework.js ./user.test.js
✓ create an user with id
```

完美解决~

真实世界里的应用函数往往不会是干净可爱的纯函数，依赖大量第三方流行库进行开发是我们的日常，也是开源世界里一件幸福的事情。

如何排除第三方依赖库进行测试，基本原理也是如上。

## 让它更优雅

每次都要调用 `node test-framework.js ./user.test.js` 来运行测试，看上去不是很好。我们让这个测试框架变得更优雅吧！

嗯，我们给这个测试框架起个名字，就叫 mjest 吧！

第一步，我们在项目新建 bin 目录，将上文的测试框架的实现丢进 ./bin/mjest.js 中。

```bash
$ tree ./bin/
./bin/
└── mjest.js
```

第二步，在 mjest.js 文件顶部加入 [Shebang](https://zh.wikipedia.org/wiki/Shebang)。使用 node 作为默认解释器。

```bash
#!/usr/bin/env node

// mjest code
```

第三步，在 package.json 中加入 bin 声明：

```json
{
  "name": "mjest",
  "version": "1.0.0",
  "description": "mini jest implementation",
  "main": "index.js",
  "bin": {
    "mjest": "./bin/mjest.js"
  }
}
```

第四步，在项目路径终端下运行 `npm link`。该命令会将项目的 bin 软链接到系统中 bin 中：

```bash
$ which mjest
/Users/sulirc/.nvm/versions/node/v10.20.1/bin/mjest
```

第五步！使用热乎乎刚出炉的 mjest 运行测试用例吧：

```bash
$ mjest ./user.test.js
✓ create an user with id
```

```bash
$ mjest ./math.test.js
✓ sum should have been called once
✓ sum should have been called with `3` `7`
✓ sumAsync adds numbers asynchronously
✓ subtractAsync subtracts numbers asynchronously
```

我们也可以用 glob 语法更优雅的匹配文件：

```bash
$ mjest *.test.js
✓ sum should have been called once
✓ sum should have been called with `3` `7`
✓ create an user with id
✓ sumAsync adds numbers asynchronously
✓ subtractAsync subtracts numbers asynchronously
```

## 更多

到此为止，相信大家应该对测试框架原理基本有一定了解了。在 jest 中，还有比如 beforeEach、beforeAll 等钩子函数，大家也可以想办法自己实现。断言库里丰富的断言函数，也可以一个一个击破。

不断丰富特性，四舍五入，我们就实现了一个测试框架。

在单元测试的基础上，其实集成测试框架原理也相差不远。因为集成测试其实就是建立在单元测试上的。大家也可以进行思考。

希望本文能够帮助大家加深理解测试框架的原理，感谢阅读~
