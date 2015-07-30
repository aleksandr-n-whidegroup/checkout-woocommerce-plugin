module.exports = function(grunt) {
    var pkg = grunt.file.readJSON('package.json');
    var credentials = grunt.file.readJSON('github-credentials.json');
    var GithubAPI = require('github');

    grunt.loadNpmTasks('grunt-contrib-compress');

    grunt.initConfig({
        compress: {
            zip_plugin: {
                options: {
                    archive: 'checkoutapipayment.zip'
                },
                files: [{
                    expand: true,
                    cwd: './wp-content/plugins/checkoutapipayment',
                    src: ['**/*'],
                    dest: './'
                }]
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

    grunt.registerTask('get-pr', 'Get opened Pull Request created by author', function() {
        var done = this.async();
        var author = grunt.option('author');
        var headBranch = 'grunt';
        var baseBranch = 'grunt';

        github.pullRequests.getAll({
            user: 'CKOTech',
            repo: pkg.name,
            state: 'open',
            head: author ? author + headBranch : credentials.username + headBranch,
            base: baseBranch
        }, function(err, res) {
            if (err) {
                grunt.fail.fatal(err);
            } else {
                grunt.config.set('pr-id', res[0].number);
                done();
            }
        });
    });

    grunt.registerTask('merge-pr', 'Merge a Pull Request', function() {
        var done = this.async();

        github.pullRequests.merge({
            user: 'CKOTech',
            repo: pkg.name,
            number: grunt.config.get('pr-id'),
            commit_message: 'Pull request merged by Grunt'
        }, function(err, res) {
            if (err) {
                grunt.fail.fatal(err);
            } else {
                done();
            }
        });
    });

    grunt.registerTask('default', ['get-pr', 'merge-pr', 'compress:zip_plugin']);
};
