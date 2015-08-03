module.exports = function(grunt) {
    var pkg = grunt.file.readJSON('package.json');
    var credentials = grunt.file.readJSON('github-credentials.json');
    var GithubAPI = require('github');
    var zipBasePath = './wp-content/plugins/checkoutapipayment/';
    var util = require('util');

    grunt.loadNpmTasks('grunt-contrib-compress');
    grunt.loadNpmTasks('grunt-shell');

    grunt.initConfig({
        compress: {
            zip_plugin: {
                options: {
                    archive: 'checkoutapipayment.zip'
                },
                files: [{
                    expand: true,
                    cwd: zipBasePath,
                    src: ['**/*'],
                    dest: './'
                }]
            }
        },
        shell: {
            gitPull: {
                command: [
                    'git checkout <%= branchName %>',
                    'git pull origin <%= branchName %>',
                    'git submodule update --init --recursive'
                ].join(' && '),
                options: {
                    callback: function(err, stdout, stderr, cb) {
                        if (!err) {
                            var msg = 'Warning: your active Git branch has been checked out, you are now on ' + grunt.config('branchName');
                            grunt.log.writeln(msg['magenta'].bold);
                        }

                        cb();
                    }
                }
            }
        }
    });

    var github = new GithubAPI({
        version: '3.0.0',
        /*debug: true,*/
        protocol: 'https',
        host: 'api.github.com',
        timeout: 5000,
        headers: {
            "user-agent": "CKOTech"
        }
    });

    github.authenticate({
        type: 'basic',
        username: credentials.username,
        password: credentials.password
    });

    function updatePackage(field, value) {
        pkg[field] = value;
        grunt.file.write('package.json', JSON.stringify(pkg, null, 2));
    }

    grunt.registerTask('merge-pr', 'Merge a specified Pull Request', function() {
        var done = this.async();

        grunt.config('branchName', grunt.option('branch'));

        github.pullRequests.merge({
            user: pkg.author.name,
            repo: pkg.name,
            number: grunt.option('pr'),
            commit_message: 'Pull request merged by Grunt'
        }, function(err, res) {
            if (err) {
                grunt.fail.fatal(err);
            } else {
                grunt.log.ok('Sucessfully merged PR#' + grunt.option('pr') + ' on ' + grunt.config('branchName'));
                done();
            }
        });
    });

    grunt.registerTask('pkg-update-contributors', 'Updates contributors in package.json', function() {
        var done = this.async();

        github.repos.getCommits({
            user: pkg.author.name,
            repo: pkg.name,
            sha: grunt.option('branch') || grunt.config('branchName')
        }, function(err, res) {
            if (err) {
                grunt.fail.warn(err);
            } else {
                var includedNames = [];
                var contributors = res.reduce(function(list, commit) {
                    var contributor = {
                        name: commit.author.login,
                        url: commit.author.html_url
                    };

                    if (includedNames.indexOf(commit.author.login) === -1) {
                        list.push(contributor);
                        includedNames.push(commit.author.login);
                    }

                    return list;
                }, []);

                includedNames = null;

                updatePackage('contributors', contributors);

                done();
            }
        });
    });

    grunt.registerTask('pkg-update-lastContributor', 'Update lastContributor in package.json', function() {
        var done = this.async();

        github.repos.getCommit({
            user: pkg.author.name,
            repo: pkg.name,
            sha: grunt.option('branch') || grunt.config('branchName')
        }, function(err, res) {
            if (err) {
                grunt.fail.warn(err);
            } else {
                var lastContributor = {
                    name: res.author.login,
                    url: res.author.html_url
                };

                updatePackage('lastContributor', lastContributor);

                done();
            }
        });
    });

    /**
     * Merge the pull request corresponding to the specified ID and branch, checkout and pull the merged branch,
     * update package.json, then create a zip of the plugin
     * USAGE: `grunt merge --pr=PR_ID --branch=BRANCH_NAME`
     */
    grunt.registerTask('merge', ['merge-pr', 'shell:gitPull', 'pkg-update-contributors', 'pkg-update-lastContributor', 'compress:zip_plugin']);

    /* USAGE: `grunt zip`, as an alias for compress:zip_plugin */
    grunt.registerTask('zip', ['compress:zip_plugin']);

    /* USAGE: `grunt pkg-update --branch=BRANCH_NAME */
    grunt.registerTask('pkg-update', ['pkg-update-contributors', 'pkg-update-lastContributor']);
};
