const { readConfigs } = require('jest-config');
const Runtime = require('jest-runtime');
const { createDirectory } = require('jest-util');
const SearchSource = require('@jest/core/build/SearchSource');
const TestWatcher = require('@jest/core/build/TestWatcher');
const TestScheduler = require('@jest/core/build/TestScheduler');
const getChangedFilesPromise = require('@jest/core/build/getChangedFilesPromise');
const testSchedulerHelper = require('@jest/core/build/testSchedulerHelper');
const ReporterDispatcher = require('@jest/core/build/ReporterDispatcher');
const jestWatcher = require('jest-watcher');
const yargs = require('yargs');
const args = require('./args');
const transform = require('@jest/transform');
const testResult = require('@jest/test-result');
const reporters = require('@jest/reporters');

const createContext = (
    config,
    { hasteFS, moduleMap },
) => ({
    config,
    hasteFS,
    moduleMap,
    resolver: Runtime.default.createResolver(config, moduleMap),
});

const buildContextsAndHasteMaps = async (
    configs,
    globalConfig,
    outputStream,
) => {
    const hasteMapInstances = Array(configs.length);
    const contexts = await Promise.all(
        configs.map(async (config, index) => {
            createDirectory(config.cacheDirectory);
            const hasteMapInstance = Runtime.default.createHasteMap(config, {
                maxWorkers: Math.max(
                    1,
                    Math.floor(globalConfig.maxWorkers / configs.length),
                ),
                resetCache: !config.cache,
                watch: globalConfig.watch || globalConfig.watchAll,
                watchman: globalConfig.watchman,
            });
            hasteMapInstances[index] = hasteMapInstance;
            return createContext(config, await hasteMapInstance.build());
        }),
    );

    return { contexts, hasteMapInstances };
};

const getTestPaths = async (
    globalConfig,
    source,
    outputStream,
    changedFiles,
    jestHooks,
    filter,
) => {
    const data = await source.getTestPaths(globalConfig, changedFiles, filter);
    const shouldTestArray = await Promise.all(
        data.tests.map(test =>
            jestHooks.shouldRunTestSuite({
                config: test.context.config,
                duration: test.duration,
                testPath: test.path,
            })
        )
    );
    const filteredTests = data.tests.filter((_test, i) => shouldTestArray[i]);
    return { ...data, allTests: filteredTests.length, tests: filteredTests };
};

const createAggregatedResults = numTotalTestSuites => {
    const result = testResult.makeEmptyAggregatedTestResult();
    result.numTotalTestSuites = numTotalTestSuites;
    result.startTime = Date.now();
    result.success = false;
    return result;
};

(async () => {
    /**
     * jest-config 模块
     * 解析命令行的参数
     */
    const rawArgv = process.argv.slice(2);
    let argv = yargs.default(rawArgv)
        .usage(args.usage)
        .version('27.0.0-next.9-dev')
        .alias('help', 'h')
        .options(args.options)
        .epilogue(args.docs).argv;

    const projects = argv.projects ? argv.projects : [];
    projects.push(process.cwd());

    /**
     * jest-config 模块
     * 通过配置文件中获取配置，获取全局配置和单独的配置对象
     * 决定使用那个测试框架，那个计时器系统和那个测试报告记录等
     * 比如：这里的 runner 默认使用了 jest-runner
     */
    const { globalConfig, configs, hasDeprecationWarnings } = await readConfigs(
        argv,
        projects,
    );
    const outputStream = process.stdout;
    outputStream.write('Hello Jest');
    const onComplete = (result) => { console.log(result) };

    /**
     * jest-haste-map 模块
     * 获取项目中的所有文件以及它们之间的依赖关系
     * 它通过查看 import/require 调用来实现这一点，
     * 从每个文件中提取它们并构建一个映射，其中包含每个文件及其依赖项
     * Haste 是 Facebook 使用的模块系统
     * 它还有一个叫做 HasteContext 的东西，因为它有 HastFS（Haste 文件系统）
     * HastFS 只是系统中文件的列表以及与之关联的所有依赖项
     * 它是一种地图数据结构，其中键是路径，值是元数据。
     */
    const { contexts, hasteMapInstances } = await buildContextsAndHasteMaps(
        configs,
        globalConfig,
        outputStream,
    );

    /**
     * SearchSource 模块
     * 从 Context 获取所有数据，并根据这些数据说，找出我们想要运行的测试
     * 它通过使用在 jest 中编写测试文件的模式来查找要运行的测试
     */
    let allTests = [];
    const searchSources = contexts.map(
        context => new SearchSource.default(context)
    );
    const changedFilesPromise = getChangedFilesPromise.default(
        globalConfig,
        configs
    );
    const testWatcher = new TestWatcher.default({
        isWatchMode: false
    });
    const jestHooks = new jestWatcher.JestHook().getEmitter();
    const testRunData = await Promise.all(
        contexts.map(async (context, index) => {
            const searchSource = searchSources[index];
            const matches = await getTestPaths(
                globalConfig,
                searchSource,
                outputStream,
                changedFilesPromise && (await changedFilesPromise),
                jestHooks,
                void 0,
            );
            allTests = allTests.concat(matches.tests);
            return {
                context,
                matches,
            };
        })
    );

    const testSchedulerContext = {
        firstRun: true,
        previousSuccess: true,
    };

    /**
     * TestScheduler 模块
     * 接收测试数组并查看所有测试、上下文、项目配置，并确定运行测试的顺序
     * 它检查此测试过去是否失败，如果是，它将首先运行该测试。
     * 有这个测试运行，如果运行时间更长，它将首先运行（以利用 cpu）
     * 以上几点都是借助缓存来实现的，如果没有缓存就看文件大小。
     * 需要改进的地方：当我们改变一些文件时，可以计算出优先级
     */
    // const scheduler = await TestScheduler.createTestScheduler(
    //     globalConfig,
    //     {
    //         startRun: () => { }
    //     },
    //     testSchedulerContext,
    // );
    // const result = await scheduler.scheduleTests(allTests, testWatcher);

    const timings = [];
    const allTestsContexts = new Set();
    allTests.forEach(test => {
        allTestsContexts.add(test.context);

        if (test.duration) {
            timings.push(test.duration);
        }
    });
    const testRunners = Object.create(null);
    const contextsByTestRunner = new WeakMap();
    const testsByRunner = Object.assign(Object.create(null), {
        [allTests[0].context.config.runner]: allTests
    });

    await Promise.all(
        Array.from(allTestsContexts).map(async context => {
            const { config } = context;
            if (!testRunners[config.runner]) {
                const transformer = await transform.createScriptTransformer(
                    config
                );
                const Runner = await transformer.requireAndTranspileModule(
                    config.runner
                );
                const runner = new Runner(globalConfig, {
                    changedFiles: void 0,
                    sourcesRelatedToTestsInChangedFiles: void 0
                });
                testRunners[config.runner] = runner;
                contextsByTestRunner.set(runner, context);
            }
        })
    );

    // 是否启用 worker
    const runInBand = testSchedulerHelper.shouldRunInBand(
        allTests,
        timings,
        globalConfig,
    );
    const aggregatedResults = createAggregatedResults(allTests.length);

    // reporter
    const dispatcher = new ReporterDispatcher.default();
    dispatcher.register(new reporters.DefaultReporter(globalConfig));
    dispatcher.register(new reporters.SummaryReporter(globalConfig));


    const onTestFileStart = dispatcher.onTestFileStart.bind(
        dispatcher
    );
    for (const runner of Object.keys(testRunners)) {
        const testRunner = testRunners[runner];
        const context = contextsByTestRunner.get(testRunner);
        const tests = testsByRunner[runner];
        const testRunnerOptions = {
            serial: runInBand || Boolean(testRunner.isSerial)
        };

        // 测试生命周期监听
        const unsubscribes = [
            testRunner.on('test-file-start', ([test]) => {
                onTestFileStart(test);
            }),
            testRunner.on('test-file-success', async ([test, result]) => {
                testResult.addResult(aggregatedResults, result);
                await dispatcher.onTestFileResult(
                    test,
                    result,
                    aggregatedResults
                );
            }),
            testRunner.on('test-file-failure', ([test, error]) => {
                console.log(test, error);
            }),
            testRunner.on(
                'test-case-result',
                ([testPath, testCaseResult]) => {
                    const test = {
                        context,
                        path: testPath
                    };
                }
            )
        ];
        await testRunner.runTests(
            tests,
            testWatcher,
            undefined,
            undefined,
            undefined,
            testRunnerOptions
        );
        unsubscribes.forEach(sub => sub());
    }

    await dispatcher.onRunComplete(contexts, aggregatedResults);
    // console.log(globalConfig);
    // console.log(configs);
    // console.log(hasDeprecationWarnings);
    // console.log(outputStream);
})();

