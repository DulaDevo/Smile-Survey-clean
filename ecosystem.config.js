module.exports = {
    name: 'Smile_Survey_clean',
    script: './App.js',
    exec_mode: 'cluster',
    instances: 'max',
    node_args: '--harmony --trace-deprecation --experimental-modules --max_old_space_size=512',
    args: '--color',
    max_restarts: 3,
    restart_delay: 3000,
    min_uptime: 3000,
    log_file: 'logs/proxy.log',
    log_date_format : 'YYYY-MM-DDTHH:mm:ssZ',
    watch: ['package.json', 'app.js', 'config/', 'src/', 'api/'],
    env_development: {
        NODE_ENV: 'development',
    },
    env_staging: {
        NODE_ENV: 'staging',
    },
    env_production: {
        NODE_ENV: 'production',
    }
};