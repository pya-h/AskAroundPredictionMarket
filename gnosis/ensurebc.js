const fs = require('fs-extra')
const path = require('path')

const artifactsDir = path.join('build', 'contracts')

for(const [newName, bcName] of [
    ['ERC20', 'Token'],
    ['ERC20Detailed', 'HumanFriendlyToken'],
    ['WETH9', 'EtherToken'],
    ['Fixed192x64Math', 'Math'],
])
    fs.copySync(path.join(artifactsDir, newName + '.json'), path.join(artifactsDir, bcName + '.json'))

const gasStatsFile = path.join('build', 'gas-stats.json')
const gasStatsObj = fs.readJsonSync(gasStatsFile)
gasStatsObj.EtherToken = gasStatsObj.WETH9
gasStatsObj.Token = gasStatsObj.ERC20
fs.writeJsonSync(gasStatsFile, gasStatsObj, { spaces: 2 })
